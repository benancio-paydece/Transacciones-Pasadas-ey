"use client"

import { Bell, Menu, User, ChevronDown, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopNavigation() {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      {/* Logo y menú */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-paydece-cyan rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-lg text-paydece-blue">paydece</span>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Controles de la derecha */}
      <div className="flex items-center gap-2">
        {/* Notificaciones */}
        <Button variant="ghost" size="sm" className="p-2">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Idioma */}
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm">ES</span>
        </Button>

        {/* Blockchain */}
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <span className="text-sm">BSC</span>
          <ChevronDown className="h-3 w-3" />
        </Button>

        {/* Perfil */}
        <Button variant="ghost" size="sm" className="p-2">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
