import { Link, NavLink, Outlet } from "react-router-dom";
import { Banner } from "./Banner";
import { RoleSwitch } from "./RoleSwitch";

export function Layout() {
  return (
    <div className="min-h-screen">
      <Banner />
      <header className="no-print flex items-center gap-6 border-b border-zinc-300 bg-white px-4 py-2">
        <Link to="/vehicles" className="text-sm font-bold tracking-tight">
          BAYLINE
        </Link>
        <nav className="flex gap-3 text-sm">
          <NavLink
            to="/vehicles"
            className={({ isActive }) =>
              isActive ? "font-semibold text-zinc-900" : "text-zinc-500"
            }
          >
            Vehículos
          </NavLink>
        </nav>
        <div className="ml-auto">
          <RoleSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
