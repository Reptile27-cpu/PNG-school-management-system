export default function TeacherDashboard() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Teacher Dashboard
        </h1>

        <p className="text-[var(--text-secondary)]">
          Manage classes, attendance, and student performance.
        </p>
      </div>


      <div className="grid md:grid-cols-3 gap-6">

        <div className="card">
          <h2 className="font-semibold">
            My Classes
          </h2>
          <p className="text-3xl mt-3">
            5
          </p>
        </div>


        <div className="card">
          <h2 className="font-semibold">
            Students
          </h2>
          <p className="text-3xl mt-3">
            120
          </p>
        </div>


        <div className="card">
          <h2 className="font-semibold">
            Attendance Today
          </h2>
          <p className="text-3xl mt-3">
            94%
          </p>
        </div>

      </div>


      <div className="card">
        <h2 className="text-xl font-bold mb-4">
          Teacher Actions
        </h2>

        <ul className="space-y-2">
          <li>✓ Mark Attendance</li>
          <li>✓ View Student Records</li>
          <li>✓ Enter Grades</li>
          <li>✓ Generate Reports</li>
        </ul>
      </div>

    </div>
  );
}