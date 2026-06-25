import { useState } from 'react';
import { useUsers } from './hooks/useUsers';
import { UsersTable } from './components/UsersTable';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { UploadExcelModal } from './components/UploadExcelModal';

function App() {
  const { users, loading, error, refetch } = useUsers();
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Users
          </h1>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Cargar Excel
          </button>
        </div>
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {!loading && !error && <UsersTable users={users} />}
      </div>
      <UploadExcelModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={refetch} />
    </div>
  );
}

export default App;
