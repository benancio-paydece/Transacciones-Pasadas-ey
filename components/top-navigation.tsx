"use client"

import { Bell, Menu, User, ChevronDown, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopNavigation() {
  return (
    <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 bg-white border-b border-gray-200">
      {/* Logo y menú */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1 md:gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-paydece-cyan rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs md:text-sm">P</span>
          </div>
          <span className="font-bold text-base md:text-lg text-paydece-blue">paydece</span>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          <Menu className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>

      {/* Controles de la derecha */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Notificaciones */}
        <Button variant="ghost" size="sm" className="p-1 md:p-2">
          <Bell className="h-3 w-3 md:h-4 md:w-4" />
        </Button>

        {/* Idioma - Hidden on mobile */}
        <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1 px-2">
          <Globe className="h-3 w-3 md:h-4 md:w-4" />
          <span className="text-xs md:text-sm">ES</span>
        </Button>

        {/* Blockchain */}
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-1 md:px-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <span className="text-xs md:text-sm">BSC</span>
          <ChevronDown className="h-2 w-2 md:h-3 md:w-3" />
        </Button>

        {/* Perfil */}
        <Button variant="ghost" size="sm" className="p-1 md:p-2">
          <User className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  )
}
