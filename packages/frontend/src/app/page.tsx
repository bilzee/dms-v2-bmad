import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Disaster Management System
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive disaster management and rapid assessment platform
          </p>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Assessments Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Assessments
            </h2>
            <p className="text-gray-600 mb-4">
              Create and manage rapid assessments for disaster situations
            </p>
            <div className="space-y-2">
              <Link 
                href="/assessments" 
                className="block btn-primary text-center"
              >
                View Assessments
              </Link>
              <Link 
                href="/assessments/new" 
                className="block btn-secondary text-center"
              >
                New Assessment
              </Link>
            </div>
          </div>

          {/* Preliminary Assessment Card */}
          <div className="card border-red-200 bg-red-50">
            <h2 className="text-xl font-semibold text-red-900 mb-4">
              🚨 Preliminary Assessment
            </h2>
            <p className="text-red-700 mb-4">
              Report new disaster situations immediately for incident creation
            </p>
            <Link 
              href="/assessments/new?type=PRELIMINARY" 
              className="block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-center"
            >
              Emergency Report
            </Link>
          </div>

          {/* Incidents Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔥 Incidents
            </h2>
            <p className="text-gray-600 mb-4">
              Monitor and manage active disaster incidents
            </p>
            <Link 
              href="/incidents" 
              className="block btn-primary text-center"
            >
              View Incidents
            </Link>
          </div>

          {/* Offline Status Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📶 System Status
            </h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-700">Online</span>
              </div>
              <p className="text-gray-600 text-sm">
                All features available including real-time sync
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⚡ Quick Actions
            </h2>
            <div className="space-y-2">
              <Link 
                href="/assessments/drafts" 
                className="block text-blue-600 hover:text-blue-800"
              >
                📝 View Drafts
              </Link>
              <Link 
                href="/assessments?filter=pending" 
                className="block text-yellow-600 hover:text-yellow-800"
              >
                ⏳ Pending Sync
              </Link>
              <Link 
                href="/assessments?filter=failed" 
                className="block text-red-600 hover:text-red-800"
              >
                ❌ Failed Sync
              </Link>
            </div>
          </div>

          {/* Help Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ℹ️ Help & Documentation
            </h2>
            <div className="space-y-2">
              <Link 
                href="/help/assessment-guide" 
                className="block text-gray-600 hover:text-gray-800"
              >
                Assessment Guide
              </Link>
              <Link 
                href="/help/offline-mode" 
                className="block text-gray-600 hover:text-gray-800"
              >
                Offline Mode Help
              </Link>
              <Link 
                href="/help/emergency-procedures" 
                className="block text-gray-600 hover:text-gray-800"
              >
                Emergency Procedures
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}