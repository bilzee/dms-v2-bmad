export default function TestGridPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Tailwind Grid Test</h1>
      
      {/* Test 1: Simple Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Test 1: Basic Grid</h2>
        <div className="grid grid-cols-4 gap-4 bg-blue-100 p-4">
          <div className="bg-red-500 h-20 flex items-center justify-center text-white">1</div>
          <div className="bg-green-500 h-20 flex items-center justify-center text-white">2</div>
          <div className="bg-blue-500 h-20 flex items-center justify-center text-white">3</div>
          <div className="bg-yellow-500 h-20 flex items-center justify-center text-white">4</div>
        </div>
      </div>

      {/* Test 2: Responsive Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Test 2: Responsive Grid (1 col mobile, 2 tablet, 4 desktop)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-green-100 p-4">
          <div className="bg-red-500 h-20 flex items-center justify-center text-white">Card 1</div>
          <div className="bg-green-500 h-20 flex items-center justify-center text-white">Card 2</div>
          <div className="bg-blue-500 h-20 flex items-center justify-center text-white">Card 3</div>
          <div className="bg-yellow-500 h-20 flex items-center justify-center text-white">Card 4</div>
        </div>
      </div>

      {/* Test 3: Same as homepage */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Test 3: Homepage Grid Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 bg-yellow-100 p-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-2xl font-bold">12</p>
            <p className="text-sm">Active Assessments</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm">Completed Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm">Pending Sync</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-2xl font-bold">1</p>
            <p className="text-sm">Critical Issues</p>
          </div>
        </div>
      </div>
    </div>
  )
}