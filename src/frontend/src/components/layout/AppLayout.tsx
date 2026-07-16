import type { ReactNode } from "react";

interface AppLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  statusBar: ReactNode;
  children: ReactNode;
}

/**
 * Estructura general de la app: sidebar a la izquierda + columna con encabezado,
 * área de contenido desplazable y barra de estado inferior.
 */
export function AppLayout({
  sidebar,
  topBar,
  statusBar,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        <main className="flex-1 overflow-auto p-6">{children}</main>
        {statusBar}
      </div>
    </div>
  );
}
