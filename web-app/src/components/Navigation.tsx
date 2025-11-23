import Link from 'next/link';

export default function Navigation() {
    return (
        <nav className="w-full bg-white border-b shadow-sm py-4 mb-8">
            <div className="max-w-6xl mx-auto px-8 flex justify-center gap-8">
                <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">Kiosk</Link>
                <Link href="/admin/mapping" className="text-gray-600 hover:text-blue-600 font-medium">Mapping</Link>
                <Link href="/admin/employees" className="text-gray-600 hover:text-blue-600 font-medium">Employees</Link>
                <Link href="/admin/attendance" className="text-gray-600 hover:text-blue-600 font-medium">Attendance</Link>
            </div>
        </nav>
    );
}
