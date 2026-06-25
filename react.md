# Arquitectura React - Air Asset Management Front

## Stack Tecnologico

| Tecnologia   | Version | Proposito                      |
|--------------|---------|--------------------------------|
| React        | 19      | Libreria UI                    |
| TypeScript   | 6       | Tipado estatico                |
| Vite         | 8       | Bundler y dev server           |
| Tailwind CSS | 4       | Estilos utilitarios            |
| OxLint       | 1.69    | Linter                         |

El backend corre en `localhost:8080` y Vite lo proxea bajo `/api` para evitar problemas de CORS en desarrollo.

---

## Estructura de Carpetas

```
src/
 ├── main.tsx              # Punto de entrada, monta <App /> en el DOM
 ├── App.tsx               # Componente raiz, orquesta toda la UI
 ├── index.css             # Estilos globales (Tailwind)
 ├── api/
 │    └── userApi.ts       # Funciones para llamar al backend (fetch)
 ├── types/
 │    └── user.ts          # Interfaz User { id, name }
 ├── hooks/
 │    └── useUsers.ts      # Custom hook: carga usuarios y maneja estado
 ├── components/
 │    ├── UsersTable.tsx    # Tabla que muestra la lista de usuarios
 │    ├── UploadExcelModal.tsx  # Modal para subir archivos Excel/CSV
 │    ├── LoadingSpinner.tsx    # Spinner animado
 │    └── ErrorMessage.tsx      # Banner de error
 └── assets/               # Archivos estaticos (imagenes, etc.)
```

---

## Diagrama de Componentes

Muestra que componente renderiza a cual y que datos pasa (props):

```
main.tsx
  │
  └── <App />                          Estado: uploadOpen, users, loading, error
       │
       ├── <LoadingSpinner />          (sin props - se muestra si loading=true)
       │
       ├── <ErrorMessage />            Props: message (string)
       │                               (se muestra si error != null)
       │
       ├── <UsersTable />              Props: users (User[])
       │                               (se muestra si !loading && !error)
       │
       └── <UploadExcelModal />        Props: open (boolean),
                                              onClose (callback),
                                              onSuccess (callback -> refetch)
```

**Reglas de renderizado en App:**
- Si `loading` es true -> solo se muestra `LoadingSpinner`
- Si `error` no es null -> solo se muestra `ErrorMessage`
- Si ninguno de los dos -> se muestra `UsersTable`
- `UploadExcelModal` siempre esta montado pero se oculta internamente cuando `open=false`

---

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND (:8080)                          │
│                                                                     │
│   GET /api/users          POST /api/users/import (FormData)        │
└──────────┬──────────────────────────────┬──────────────────────────┘
           │                              │
           │ fetch                        │ fetch (POST)
           │                              │
┌──────────▼──────────────────────────────▼──────────────────────────┐
│                         api/userApi.ts                              │
│                                                                     │
│   fetchUsers(): Promise<User[]>    importUsers(file): Promise<void>│
└──────────┬──────────────────────────────┬──────────────────────────┘
           │                              │
           │ llamado por                  │ llamado por
           │                              │
┌──────────▼──────────┐      ┌────────────▼─────────────────────────┐
│  hooks/useUsers.ts  │      │  components/UploadExcelModal.tsx     │
│                     │      │                                       │
│  - users: User[]    │      │  Llama importUsers(file) al hacer    │
│  - loading: boolean │      │  submit del formulario               │
│  - error: string    │      │                                       │
│  - refetch()        │      │  En caso de exito:                   │
│                     │      │    1. Llama onSuccess() (= refetch)  │
│                     │      │    2. Llama onClose()                │
└──────────┬──────────┘      └──────────────────────────────────────┘
           │
           │ retorna estado
           │
┌──────────▼──────────────────────────────────────────┐
│                      App.tsx                         │
│                                                      │
│  Usa useUsers() para obtener { users, loading,       │
│  error, refetch }                                    │
│                                                      │
│  Pasa los datos a los componentes hijos via props    │
└──────────────────────────────────────────────────────┘
```

---

## Como Funciona el Hook `useUsers`

Este es el corazon del manejo de datos. Asi funciona paso a paso:

```
useUsers()
  │
  ├── Estado interno:
  │     users = []
  │     loading = true
  │     error = null
  │     version = 0           <── contador que dispara re-fetches
  │
  ├── useEffect (depende de version):
  │     1. Pone loading = true, error = null
  │     2. Llama fetchUsers()
  │     3a. Si exito  -> users = data, loading = false
  │     3b. Si error  -> error = mensaje, loading = false
  │     4. Cleanup: marca cancelled=true para ignorar
  │        respuestas de llamadas obsoletas
  │
  └── refetch():
        Incrementa version (version + 1)
        Esto hace que useEffect se re-ejecute
        y vuelva a llamar al backend
```

**Por que usa `version` en lugar de llamar fetchUsers directamente?**
Porque React requiere que los side effects (como llamadas HTTP) se ejecuten dentro de `useEffect`. Al cambiar `version`, se dispara el efecto de nuevo de forma segura y se cancela cualquier peticion anterior que este en curso.

---

## Ciclo de Vida: Carga Inicial

Que pasa cuando el usuario abre la pagina:

```
1. main.tsx monta <App />
         │
2. App llama useUsers()
         │
3. useUsers ejecuta useEffect
         │
4. loading=true ──> App renderiza <LoadingSpinner />
         │
5. fetchUsers() llama GET /api/users
         │
    ┌────┴────┐
    ▼         ▼
  Exito     Error
    │         │
    ▼         ▼
6a. users    6b. error = "Failed to fetch..."
    se           │
    actualiza    ▼
    │         App renderiza <ErrorMessage message="..." />
    ▼
7. App renderiza <UsersTable users=[...] />
```

---

## Ciclo de Vida: Subir un Archivo Excel

Que pasa cuando el usuario sube un archivo:

```
1. Usuario hace click en "Cargar Excel"
         │
2. App pone uploadOpen=true
         │
3. <UploadExcelModal open=true /> se muestra
         │
4. Usuario arrastra un archivo o lo selecciona
         │
5. El archivo se guarda en estado local (file)
         │
6. Usuario hace click en "Subir archivo"
         │
7. handleSubmit():
   ├── uploading = true
   ├── Llama importUsers(file) ──> POST /api/users/import
   │
   ├── Si exito:
   │   ├── file = null
   │   ├── Llama onSuccess() ──> que es refetch() de useUsers
   │   │         │
   │   │         └── version++ ──> useEffect se re-ejecuta
   │   │                   │
   │   │                   └── GET /api/users (datos frescos)
   │   │                            │
   │   │                            └── UsersTable se re-renderiza
   │   │
   │   └── Llama onClose() ──> uploadOpen=false ──> modal se oculta
   │
   └── Si error:
       └── error = "Error al subir el archivo"
           (se muestra dentro del modal)
```

---

## Comunicacion entre Componentes

React usa un flujo **unidireccional** (de arriba hacia abajo). Aqui esta como se comunican:

```
                    App (estado central)
                   /    |       \       \
                  /     |        \       \
                 ▼      ▼        ▼       ▼
          Loading   Error    UsersTable  UploadModal
          Spinner   Message
                                            │
            DATOS BAJAN (props)             │ EVENTOS SUBEN
            ─────────────────►              │ (callbacks)
                                            │
            users ──────────► UsersTable    │
            message ────────► ErrorMessage  │
            open ───────────► Modal         │
                                            │
            onClose ◄──────── Modal         │
            onSuccess ◄────── Modal  ───────┘
                │
                ▼
            refetch() en useUsers
                │
                ▼
            Nueva llamada al backend
                │
                ▼
            UsersTable se actualiza
```

**Resumen de la comunicacion:**
- **Props hacia abajo**: App pasa datos (users, error, loading) y funciones (onClose, onSuccess) a sus hijos
- **Callbacks hacia arriba**: Los hijos notifican al padre cuando algo pasa (modal cerrado, archivo subido exitosamente)
- **No hay comunicacion directa entre hermanos**: UsersTable y UploadExcelModal no hablan entre si. Todo pasa a traves de App

---

## Interfaz User

```typescript
interface User {
  id: number;    // Identificador unico
  name: string;  // Nombre del usuario
}
```

Esta interfaz se usa en:
- `api/userApi.ts` - como tipo de retorno de fetchUsers()
- `hooks/useUsers.ts` - para tipar el estado users
- `components/UsersTable.tsx` - para tipar las props

---

## API del Backend

| Endpoint              | Metodo | Body                  | Respuesta     | Usado por           |
|-----------------------|--------|-----------------------|---------------|---------------------|
| `/api/users`          | GET    | -                     | `User[]`      | useUsers (auto)     |
| `/api/users/import`   | POST   | FormData con `file`   | -             | UploadExcelModal    |

El proxy de Vite redirige todas las peticiones `/api/*` al backend en `http://localhost:8080`.

---

## Glosario Rapido de Conceptos React

| Concepto       | Que es                                                                                         |
|----------------|-----------------------------------------------------------------------------------------------|
| **Componente** | Funcion que retorna JSX (HTML-like). Se reutiliza como un bloque de LEGO                      |
| **Props**      | Parametros que un componente padre pasa a un hijo. Son de solo lectura                         |
| **Estado**     | Datos internos de un componente que al cambiar causan un re-render (useState)                  |
| **Hook**       | Funcion especial de React (empieza con `use`) que permite agregar logica reutilizable          |
| **useEffect**  | Hook que ejecuta codigo cuando algo cambia (ej: llamar al backend al cargar la pagina)         |
| **useState**   | Hook que crea una variable de estado y su funcion setter                                       |
| **Callback**   | Funcion que se pasa como prop para que un hijo pueda notificar al padre de un evento           |
| **JSX**        | Sintaxis que parece HTML pero es JavaScript. Se usa para describir la UI                       |
| **Re-render**  | React vuelve a ejecutar el componente y actualiza el DOM solo donde cambio algo                |
