"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { CalendarIcon, Filter, Search, Download, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Tipos para las transacciones
interface Transaction {
  id: string
  date: string
  time: string
  timestamp: number
  cryptoAmount: number
  cryptoCurrency: string
  fiatAmount: number
  fiatCurrency: string
  status: string
  operation: string
  counterparty: {
    wallet: string
    telegram: string
  }
  reference: string
  fee: number
  net: number
}

const formatCrypto = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatFiat = (amount: number): string => {
  const formatted = new Intl.NumberFormat("es-ES", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  // Truncar si es muy largo (más de 12 caracteres)
  if (formatted.length > 12) {
    return formatted.substring(0, 9) + "..."
  }
  return formatted
}

// Función para truncar wallet
const truncateWallet = (wallet: string): string => {
  if (wallet.length <= 10) return wallet
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

// Mover la función formatLocalDateTime aquí
const formatLocalDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const localDate = new Date(date.getTime())

  // Obtener offset de zona horaria en minutos y convertir a horas
  const timezoneOffset = -localDate.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
  const offsetMinutes = Math.abs(timezoneOffset) % 60
  const offsetSign = timezoneOffset >= 0 ? "+" : "-"
  const utcString = `UTC ${offsetSign}${offsetHours}${offsetMinutes > 0 ? ":" + offsetMinutes.toString().padStart(2, "0") : ""}`

  const dateStr = localDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const timeStr = localDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return {
    date: dateStr,
    time: timeStr,
    utc: utcString,
    fullDateTime: `${dateStr} ${timeStr} ${utcString}`,
  }
}

// Función para formatear estados correctamente
const formatStatus = (status: string): string => {
  switch (status) {
    case "iniciada":
      return "Iniciada"
    case "en-custodia":
    case "en custodia":
      return "En Custodia"
    case "pagado":
      return "Pagado"
    case "finalizado":
      return "Finalizado"
    case "cancelado":
      return "Cancelado"
    case "reembolsado":
      return "Reembolsado"
    case "apelado":
      return "Apelado"
    case "liberado":
      return "Liberado"
    case "transferido":
      return "Transferido"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

// Función para formatear operaciones correctamente
const formatOperation = (operation: string): string => {
  switch (operation) {
    case "compra":
      return "Compra"
    case "venta":
      return "Venta"
    default:
      return operation.charAt(0).toUpperCase() + operation.slice(1)
  }
}

// Función para descargar CSV que coincida exactamente con las columnas de la tabla
const downloadCSV = (data: Transaction[], filename: string): void => {
  // Preparar los datos para CSV con las mismas columnas que se muestran en la tabla
  const csvData = data.map((transaction) => {
    const localDateTime = formatLocalDateTime(transaction.timestamp)
    return {
      Fecha: localDateTime.fullDateTime,
      Contraparte: `${transaction.counterparty.wallet} ${transaction.counterparty.telegram}`,
      "Monto Cripto": transaction.cryptoAmount,
      "Moneda Cripto": transaction.cryptoCurrency,
      "Monto FIAT": transaction.fiatAmount,
      "Moneda FIAT": transaction.fiatCurrency,
      Operación: transaction.operation,
      "# de Transacción": transaction.id,
      Estado: formatStatus(transaction.status),
    }
  })

  // Crear el contenido CSV
  const headers = Object.keys(csvData[0])
  const csvContent = [
    headers.join(","),
    ...csvData.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof typeof row]
          // Escapar comillas y envolver en comillas si contiene comas
          return typeof value === "string" && value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(","),
    ),
  ].join("\n")

  // Crear y descargar el archivo
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Estado para el modal de detalles
const TransactionsTab = () => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleRowClick = (transaction: Transaction): void => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const closeModal = (): void => {
    setIsModalOpen(false)
    setSelectedTransaction(null)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // Opcional: agregar feedback visual
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "iniciada":
        return <Badge className="paydece-badge-blue text-xs">Iniciada</Badge>
      case "en-custodia":
      case "en custodia":
        return <Badge className="paydece-badge-orange text-xs">En Custodia</Badge>
      case "pagado":
        return <Badge className="paydece-badge-green text-xs">Pagado</Badge>
      case "finalizado":
        return <Badge className="paydece-badge-green text-xs">Finalizado</Badge>
      case "cancelado":
        return <Badge className="paydece-badge-red text-xs">Cancelado</Badge>
      case "reembolsado":
        return <Badge className="paydece-badge-purple text-xs">Reembolsado</Badge>
      case "apelado":
        return <Badge className="paydece-badge-yellow text-xs">Apelado</Badge>
      case "liberado":
        return <Badge className="paydece-badge-gray text-xs">Liberado</Badge>
      case "transferido":
        return <Badge className="paydece-badge-blue text-xs">Transferido</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case "compra":
        return <Badge className="paydece-badge-green text-xs">Compra</Badge>
      case "venta":
        return <Badge className="paydece-badge-blue text-xs">Venta</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {operation}
          </Badge>
        )
    }
  }

  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [operationFilter, setOperationFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "timestamp",
    direction: "desc",
  })

  // Estados para scroll infinito
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const ITEMS_PER_PAGE = 10

  // Ref para el contenedor de scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Transacción de ejemplo para mostrar en móvil
  const allTransactions: Transaction[] = [
    {
      id: "TXN-001",
      date: "15/12/2024",
      time: "14:30",
      timestamp: new Date("2024-12-15T14:30:00Z").getTime(),
      cryptoAmount: 1250.0,
      cryptoCurrency: "USDC",
      fiatAmount: 1312500.0,
      fiatCurrency: "ARS",
      status: "finalizado",
      operation: "compra",
      counterparty: {
        wallet: "0x1234567890abcdef1234567890abcdef12345678",
        telegram: "@maria_crypto",
      },
      reference: "REF-2024-001",
      fee: 37.5,
      net: 1212.5,
    },
  ]

  // TODO: Implementar llamada a API para obtener estadísticas
  // Ejemplo:
  // useEffect(() => {
  //   async function fetchStats() {
  //     try {
  //       const response = await fetch('/api/stats');
  //       const data = await response.json();
  //       setMonthlyVolume(data.monthlyVolume);
  //       setCompletedTransactionsCount(data.completedTransactionsCount);
  //       setOrdersInProcessCount(data.ordersInProcessCount);
  //     } catch (error) {
  //       console.error('Error fetching stats:', error);
  //     }
  //   }
  //   fetchStats();
  // }, []);

  // Placeholders temporales - reemplazar con datos de API
  const monthlyVolume = "1,250"
  const completedTransactionsCount = 1
  const ordersInProcessCount = 0

  // Función para limpiar filtros
  const clearFilters = (): void => {
    setSearchTerm("")
    setStatusFilter("all")
    setOperationFilter("all")
    setDateRange({ from: undefined, to: undefined })
    setSortConfig({ key: "timestamp", direction: "desc" })
    setCurrentPage(0)
    setDisplayedTransactions([])
    setHasMore(true)
    setInitialLoad(true)
  }

  // Función para descargar resumen
  const downloadSummary = (): void => {
    const filteredData = getFilteredTransactions()
    const filename = `resumen_transacciones_paydece_${new Date().toISOString().split("T")[0]}.csv`
    downloadCSV(filteredData, filename)
  }

  // Función para manejar cambio en filtro de operación
  const handleOperationFilterChange = (value: string): void => {
    setOperationFilter(value)
    if (value === "compra" || value === "venta") {
      setSortConfig({ key: "timestamp", direction: "desc" })
    }
    setCurrentPage(0)
    setDisplayedTransactions([])
    setHasMore(true)
    setInitialLoad(true)
  }

  // Función para obtener transacciones filtradas
  const getFilteredTransactions = (): Transaction[] => {
    // TODO: Esta función debería hacer llamada a API con parámetros de filtro
    // en lugar de filtrar localmente
    return allTransactions
      .filter((transaction) => {
        const searchLower = searchTerm.toLowerCase().trim()
        let matchesSearch = true

        if (searchTerm.trim().length >= 3) {
          const localDateTime = formatLocalDateTime(transaction.timestamp)

          matchesSearch =
            transaction.id.toLowerCase().startsWith(searchLower) ||
            transaction.counterparty.wallet.toLowerCase().startsWith(searchLower) ||
            transaction.counterparty.telegram.toLowerCase().startsWith(searchLower) ||
            (transaction.reference && transaction.reference.toLowerCase().startsWith(searchLower)) ||
            transaction.cryptoAmount.toString().startsWith(searchTerm.trim()) ||
            transaction.cryptoCurrency.toLowerCase().startsWith(searchLower) ||
            transaction.fiatAmount.toString().startsWith(searchTerm.trim()) ||
            transaction.fiatCurrency.toLowerCase().startsWith(searchLower) ||
            formatStatus(transaction.status).toLowerCase().startsWith(searchLower) ||
            transaction.operation.toLowerCase().startsWith(searchLower) ||
            localDateTime.date.startsWith(searchTerm.trim()) ||
            localDateTime.time.startsWith(searchTerm.trim())
        }

        const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
        const matchesOperation = operationFilter === "all" || transaction.operation === operationFilter

        let matchesDateRange = true
        if (dateRange.from || dateRange.to) {
          const txDate = new Date(transaction.timestamp)
          if (dateRange.from && dateRange.to) {
            matchesDateRange = txDate >= dateRange.from && txDate <= dateRange.to
          } else if (dateRange.from) {
            matchesDateRange = txDate >= dateRange.from
          } else if (dateRange.to) {
            matchesDateRange = txDate <= dateRange.to
          }
        }

        return matchesSearch && matchesStatus && matchesOperation && matchesDateRange
      })
      .sort((a, b) => {
        if (sortConfig.key === "timestamp") {
          return sortConfig.direction === "asc" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
        }

        if (sortConfig.key === "counterparty") {
          return sortConfig.direction === "asc"
            ? a.counterparty.telegram.localeCompare(b.counterparty.telegram)
            : b.counterparty.telegram.localeCompare(a.counterparty.telegram)
        }

        if (sortConfig.key === "crypto") {
          return sortConfig.direction === "asc" ? a.cryptoAmount - b.cryptoAmount : b.cryptoAmount - a.cryptoAmount
        }

        if (sortConfig.key === "fiat") {
          const currencyCompare = a.fiatCurrency.localeCompare(b.fiatCurrency)
          if (currencyCompare !== 0) {
            return sortConfig.direction === "asc" ? currencyCompare : -currencyCompare
          }
          return sortConfig.direction === "asc" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
        }

        if (sortConfig.key === "operation") {
          const operationCompare = a.operation.localeCompare(b.operation)
          if (operationCompare !== 0) {
            return sortConfig.direction === "asc" ? operationCompare : -operationCompare
          }
          return b.timestamp - a.timestamp
        }

        if (sortConfig.key === "id") {
          return sortConfig.direction === "asc" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
        }

        if (sortConfig.key === "status") {
          const getStatusPriority = (status: string): number => {
            switch (status) {
              case "apelado":
                return 1
              case "en custodia":
                return 2
              case "iniciada":
                return 3
              case "pagado":
                return 4
              case "finalizado":
                return 5
              case "cancelado":
                return 6
              case "reembolsado":
                return 7
              case "liberado":
                return 8
              case "transferido":
                return 9
              default:
                return 10
            }
          }

          const priorityA = getStatusPriority(a.status)
          const priorityB = getStatusPriority(b.status)

          if (priorityA !== priorityB) {
            return sortConfig.direction === "asc" ? priorityA - priorityB : priorityB - priorityA
          }

          return b.timestamp - a.timestamp
        }

        return 0
      })
  }

  // Función para cargar más transacciones MEJORADA
  const loadMoreTransactions = useCallback(() => {
    if (loading || !hasMore) return

    setLoading(true)

    // Simular delay de red solo en la carga inicial
    const delay = initialLoad ? 800 : 300

    setTimeout(() => {
      const filteredTransactions = getFilteredTransactions()
      const startIndex = currentPage * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newTransactions = filteredTransactions.slice(startIndex, endIndex)

      if (newTransactions.length === 0 || startIndex >= filteredTransactions.length) {
        setHasMore(false)
      } else {
        if (currentPage === 0) {
          setDisplayedTransactions(newTransactions)
        } else {
          setDisplayedTransactions((prev) => [...prev, ...newTransactions])
        }
        setCurrentPage((prev) => prev + 1)

        // Si hay más datos disponibles, mantener hasMore en true
        if (endIndex < filteredTransactions.length) {
          setHasMore(true)
        } else {
          setHasMore(false)
        }
      }

      setLoading(false)
      setInitialLoad(false)
    }, delay)
  }, [
    currentPage,
    loading,
    hasMore,
    searchTerm,
    statusFilter,
    operationFilter,
    dateRange,
    sortConfig,
    initialLoad,
    getFilteredTransactions,
  ])

  // Efecto para cargar transacciones iniciales y cuando cambien los filtros
  useEffect(() => {
    setDisplayedTransactions([])
    setCurrentPage(0)
    setHasMore(true)
    setLoading(false)
    setInitialLoad(true)
  }, [searchTerm, statusFilter, operationFilter, dateRange, sortConfig])

  // Efecto separado para cargar datos cuando se resetean los filtros
  useEffect(() => {
    if (displayedTransactions.length === 0 && !loading && hasMore) {
      loadMoreTransactions()
    }
  }, [displayedTransactions.length, loading, hasMore, loadMoreTransactions])

  // Efecto para scroll infinito MEJORADO - usando el contenedor específico
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return

      const container = scrollContainerRef.current
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // Detectar cuando estamos cerca del final (100px antes)
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (scrolledToBottom && !loading && hasMore) {
        loadMoreTransactions()
      }
    }

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [loadMoreTransactions, loading, hasMore])

  // Función para cambiar el orden
  const requestSort = (key: string): void => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
    setCurrentPage(0)
    setDisplayedTransactions([])
    setHasMore(true)
    setInitialLoad(true)
  }

  // Función para obtener el indicador de dirección de ordenamiento
  const getSortDirection = (key: string): string => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓"
    }
    return ""
  }

  return (
    <div className="h-full bg-paydece-gradient overflow-hidden">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        {/* Stats Cards - Responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-gray-200 overflow-hidden">
          <Card className="bg-white border-0 rounded-none border-b md:border-b-0 md:border-r border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-5 pt-3">
              <CardTitle className="text-sm md:text-base font-semibold">Volumen Mensual (últimos 30 días)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-3 md:px-5">
              <div className="text-xl md:text-2xl font-bold text-paydece-blue">{monthlyVolume} USDC</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 rounded-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-5 pt-3">
              <CardTitle className="text-sm md:text-base font-semibold">
                Transacciones completadas (últimos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-3 md:px-5">
              <div className="text-xl md:text-2xl font-bold text-paydece-blue">{completedTransactionsCount}</div>
              <p className="text-sm md:text-base text-muted-foreground">{ordersInProcessCount} órdenes en proceso</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Responsive layout */}
        <Card className="paydece-card rounded-none border-l border-r border-gray-200">
          <CardHeader className="pb-2 px-3 md:px-5 pt-1">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="flex items-center gap-2 rounded-full text-xs md:text-sm px-2 md:px-3 py-1.5 h-7 md:h-8 flex-1 sm:flex-none"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Limpiar filtros</span>
                    <span className="sm:hidden">Limpiar</span>
                  </Button>
                  <Button
                    onClick={downloadSummary}
                    className="bg-black text-white font-medium rounded-full transition-all hover:opacity-90 flex items-center gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 h-7 md:h-8 flex-1 sm:flex-none"
                  >
                    <Download className="h-3 w-3" />
                    <span className="hidden sm:inline">Descargar resumen</span>
                    <span className="sm:hidden">Descargar</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3 md:px-5">
            <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="search" className="text-xs md:text-sm font-medium">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 md:left-3 top-1.5 md:top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Escribe 3 letras"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-6 md:pl-8 rounded-full text-xs md:text-sm h-7 md:h-8 focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="status" className="text-xs md:text-sm font-medium">
                  Estado
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-full text-xs md:text-sm h-7 md:h-8 focus:ring-gray-500 focus:border-gray-500">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="iniciada">Iniciada</SelectItem>
                    <SelectItem value="en custodia">En Custodia</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="reembolsado">Reembolsado</SelectItem>
                    <SelectItem value="apelado">Apelado</SelectItem>
                    <SelectItem value="liberado">Liberado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="operation" className="text-xs md:text-sm font-medium">
                  Operación
                </Label>
                <Select value={operationFilter} onValueChange={handleOperationFilterChange}>
                  <SelectTrigger className="rounded-full text-xs md:text-sm h-7 md:h-8 focus:ring-gray-500 focus:border-gray-500">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="date" className="text-xs md:text-sm font-medium">
                  Fecha
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-full text-xs md:text-sm h-7 md:h-8 focus:ring-gray-500 focus:border-gray-500",
                        !dateRange.from && !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-1 md:mr-2 h-3 w-3" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: es })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: es })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: es })
                        )
                      ) : (
                        "Rango"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table - Mobile responsive */}
        <Card className="paydece-card rounded-bl-xl rounded-br-xl rounded-tl-none rounded-tr-none border-t-0 border-gray-200 flex-1">
          <CardContent className="p-0 h-full">
            <div className="overflow-hidden h-full">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[12%] text-center font-semibold"
                        onClick={() => requestSort("timestamp")}
                      >
                        Fecha{getSortDirection("timestamp")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[18%] text-center font-semibold"
                        onClick={() => requestSort("counterparty")}
                      >
                        Contraparte{getSortDirection("counterparty")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[12%] text-center font-semibold"
                        onClick={() => requestSort("crypto")}
                      >
                        Cripto{getSortDirection("crypto")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[12%] text-center font-semibold"
                        onClick={() => requestSort("fiat")}
                      >
                        FIAT{getSortDirection("fiat")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[10%] text-center font-semibold"
                        onClick={() => requestSort("operation")}
                      >
                        Operación{getSortDirection("operation")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[14%] text-center font-semibold"
                        onClick={() => requestSort("id")}
                      >
                        # Transacción{getSortDirection("id")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 text-sm py-2 px-3 w-[12%] text-center font-semibold"
                        onClick={() => requestSort("status")}
                      >
                        Estado{getSortDirection("status")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTransactions.map((transaction) => {
                      const localDateTime = formatLocalDateTime(transaction.timestamp)
                      return (
                        <TableRow
                          key={transaction.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleRowClick(transaction)}
                        >
                          <TableCell className="py-2 px-3 w-[12%]">
                            <div className="flex flex-col text-center">
                              <span className="text-sm font-medium">{localDateTime.date}</span>
                              <span className="text-xs text-muted-foreground">
                                {localDateTime.time} {localDateTime.utc}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3 w-[18%]">
                            <div className="flex flex-col text-center">
                              <span className="font-medium text-sm">
                                {truncateWallet(transaction.counterparty.wallet)}
                              </span>
                              <span className="text-xs text-muted-foreground">{transaction.counterparty.telegram}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm py-2 px-3 w-[12%] text-center">
                            <div className="flex flex-col">
                              <span className="text-sm">{formatCrypto(transaction.cryptoAmount)}</span>
                              <span className="text-xs text-muted-foreground">{transaction.cryptoCurrency}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm py-2 px-3 w-[12%] text-center">
                            <div className="flex flex-col">
                              <span className="text-sm">{formatFiat(transaction.fiatAmount)}</span>
                              <span className="text-xs text-muted-foreground">{transaction.fiatCurrency}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3 w-[10%] text-center">
                            {getOperationBadge(transaction.operation)}
                          </TableCell>
                          <TableCell className="font-medium text-sm py-2 px-3 w-[14%] text-center">
                            {transaction.id}
                          </TableCell>
                          <TableCell className="py-2 px-3 w-[12%] text-center">
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout - Rediseñado según especificaciones */}
              <div className="md:hidden space-y-3 p-3">
                {displayedTransactions.map((transaction) => {
                  const localDateTime = formatLocalDateTime(transaction.timestamp)
                  return (
                    <div
                      key={transaction.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                      onClick={() => handleRowClick(transaction)}
                    >
                      {/* Header con estado como título y operación */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          {getStatusBadge(transaction.status)}
                          <span className="text-xs text-gray-500 mt-1">{formatOperation(transaction.operation)}</span>
                        </div>
                      </div>

                      {/* Información principal */}
                      <div className="space-y-3">
                        {/* # Transacción */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600"># Transacción:</span>
                          <span className="text-xs text-gray-900">{transaction.id}</span>
                        </div>

                        {/* Fecha */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Fecha:</span>
                          <span className="text-xs text-gray-900">
                            {localDateTime.date} {localDateTime.time} {localDateTime.utc}
                          </span>
                        </div>

                        {/* Contraparte */}
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-medium text-gray-600">Contraparte:</span>
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-900">
                              {truncateWallet(transaction.counterparty.wallet)}
                            </div>
                            <div className="text-xs text-gray-500">{transaction.counterparty.telegram}</div>
                          </div>
                        </div>

                        {/* Cripto */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Cripto:</span>
                          <span className="text-xs font-medium text-gray-900">
                            {formatCrypto(transaction.cryptoAmount)} {transaction.cryptoCurrency}
                          </span>
                        </div>

                        {/* FIAT */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">FIAT:</span>
                          <span className="text-xs font-medium text-gray-900">
                            {formatFiat(transaction.fiatAmount)} {transaction.fiatCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Loading and status indicators remain the same */}
              {initialLoad && loading && (
                <div className="flex justify-center py-8 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-paydece-blue"></div>
                    <div className="text-sm text-muted-foreground font-medium">Cargando transacciones...</div>
                  </div>
                </div>
              )}

              {loading && !initialLoad && displayedTransactions.length > 0 && (
                <div className="flex justify-center py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paydece-blue"></div>
                    <div className="text-sm text-muted-foreground">Cargando más órdenes...</div>
                  </div>
                </div>
              )}

              {!hasMore && displayedTransactions.length > 0 && !loading && (
                <div className="flex justify-center py-4 border-t border-gray-200">
                  <div className="text-sm text-muted-foreground">No hay más transacciones para mostrar</div>
                </div>
              )}

              {displayedTransactions.length === 0 && !loading && (
                <div className="flex justify-center py-8">
                  <div className="text-sm text-muted-foreground">No se encontraron transacciones</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Modal de detalles de transacción */}
        {isModalOpen && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Header del modal */}
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-paydece-blue">Transacción {selectedTransaction.id}</h2>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
                    ×
                  </button>
                </div>

                {/* Badges de operación y estado */}
                <div className="flex items-center gap-2">
                  {getOperationBadge(selectedTransaction.operation)}
                  {getStatusBadge(selectedTransaction.status)}
                </div>

                {/* Información general */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Fecha y hora</h3>
                      <p className="text-base font-medium">
                        {formatLocalDateTime(selectedTransaction.timestamp).fullDateTime}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Referencia</h3>
                      <p className="text-base font-medium">{selectedTransaction.reference}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Monto Cripto</h3>
                      <p className="text-base font-medium">
                        {formatCrypto(selectedTransaction.cryptoAmount)} {selectedTransaction.cryptoCurrency}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Monto FIAT</h3>
                      <p className="text-base font-medium">
                        {new Intl.NumberFormat("es-ES", {
                          style: "decimal",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(selectedTransaction.fiatAmount)}{" "}
                        {selectedTransaction.fiatCurrency}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <hr className="border-gray-200" />

                {/* Información de contraparte */}
                <div>
                  <h3 className="text-base font-medium mb-3">Información de contraparte</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Wallet</p>
                        <p className="text-sm font-medium">{selectedTransaction.counterparty.wallet}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedTransaction.counterparty.wallet)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                      >
                        📋
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Telegram</p>
                        <p className="text-sm font-medium">{selectedTransaction.counterparty.telegram}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(selectedTransaction.counterparty.telegram)}
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          📋
                        </button>
                        <button
                          onClick={() =>
                            window.open(
                              `https://t.me/${selectedTransaction.counterparty.telegram.substring(1)}`,
                              "_blank",
                            )
                          }
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <hr className="border-gray-200" />

                {/* Detalles financieros */}
                <div>
                  <h3 className="text-base font-medium mb-3">Detalles financieros</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Monto bruto</p>
                      <p className="text-sm font-medium">
                        {formatCrypto(selectedTransaction.cryptoAmount)} {selectedTransaction.cryptoCurrency}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Comisión</p>
                      <p className="text-sm font-medium">
                        {formatCrypto(selectedTransaction.fee)} {selectedTransaction.cryptoCurrency}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Monto neto</p>
                      <p className="text-sm font-medium">
                        {formatCrypto(selectedTransaction.net)} {selectedTransaction.cryptoCurrency}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline">Descargar comprobante</Button>
                  {selectedTransaction.status === "iniciada" && (
                    <Button className="paydece-button-secondary">Cancelar transacción</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionsTab
