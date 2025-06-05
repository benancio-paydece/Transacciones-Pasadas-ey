"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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

// Restaurar la función handleRowClick para abrir en nueva pestaña como funcionaba antes
const handleRowClick = (transaction: Transaction): void => {
  // Abrir detalles en nueva pestaña
  const detailsUrl = `/transaction/${transaction.id}`
  window.open(detailsUrl, "_blank")
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

export default function TransactionsTab() {
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

  // Definir allTransactions PRIMERO
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
    {
      id: "TXN-002",
      date: "15/12/2024",
      time: "12:15",
      timestamp: new Date("2024-12-15T12:15:00Z").getTime(),
      cryptoAmount: 850.0,
      cryptoCurrency: "USDC",
      fiatAmount: 765.0,
      fiatCurrency: "EUR",
      status: "finalizado",
      operation: "venta",
      counterparty: {
        wallet: "0x9876543210fedcba9876543210fedcba98765432",
        telegram: "@carlos_trader",
      },
      reference: "REF-2024-002",
      fee: 25.5,
      net: 824.5,
    },
    {
      id: "TXN-003",
      date: "14/12/2024",
      time: "16:45",
      timestamp: new Date("2024-12-14T16:45:00Z").getTime(),
      cryptoAmount: 2100.0,
      cryptoCurrency: "USDC",
      fiatAmount: 2100.0,
      fiatCurrency: "USD",
      status: "finalizado",
      operation: "compra",
      counterparty: {
        wallet: "0x5555555555555555555555555555555555555555",
        telegram: "@ana_defi",
      },
      reference: "REF-2024-003",
      fee: 63.0,
      net: 2037.0,
    },
    {
      id: "TXN-004",
      date: "14/12/2024",
      time: "09:20",
      timestamp: new Date("2024-12-14T09:20:00Z").getTime(),
      cryptoAmount: 450.0,
      cryptoCurrency: "USDC",
      fiatAmount: 472500.0,
      fiatCurrency: "ARS",
      status: "cancelado",
      operation: "venta",
      counterparty: {
        wallet: "0x7777777777777777777777777777777777777777",
        telegram: "@luis_p2p",
      },
      reference: "REF-2024-004",
      fee: 0.0,
      net: 0.0,
    },
    {
      id: "TXN-005",
      date: "13/12/2024",
      time: "11:55",
      timestamp: new Date("2024-12-13T11:55:00Z").getTime(),
      cryptoAmount: 3200.0,
      cryptoCurrency: "USDC",
      fiatAmount: 2880.0,
      fiatCurrency: "EUR",
      status: "finalizado",
      operation: "compra",
      counterparty: {
        wallet: "0x2222222222222222222222222222222222222222",
        telegram: "@sofia_btc",
      },
      reference: "REF-2024-005",
      fee: 96.0,
      net: 3104.0,
    },
    // Agregamos más transacciones para simular scroll infinito (carga inicial de 10)
    ...Array.from({ length: 150 }, (_, i): Transaction => {
      const randomDaysAgo = Math.floor(Math.random() * 25) + 1
      const date = new Date()
      date.setDate(date.getDate() - randomDaysAgo)

      return {
        id: `TXN-${String(i + 6).padStart(3, "0")}`,
        date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
        time: `${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
        timestamp: date.getTime(),
        cryptoAmount: Math.floor(Math.random() * 5000) + 100,
        cryptoCurrency: "USDC",
        fiatAmount: Math.floor(Math.random() * 5000000) + 100000,
        fiatCurrency: ["ARS", "EUR", "USD"][Math.floor(Math.random() * 3)],
        status: (() => {
          // Distribución fija de estados basada en el índice
          const statusDistribution = [
            "finalizado",
            "finalizado",
            "finalizado",
            "finalizado",
            "finalizado", // 33% finalizadas
            "iniciada",
            "iniciada",
            "en custodia",
            "en custodia",
            "pagado", // 33% en proceso
            "cancelado",
            "reembolsado",
            "apelado",
            "liberado",
            "transferido", // 33% otros estados
          ]
          return statusDistribution[i % statusDistribution.length]
        })(),
        operation: ["compra", "venta"][Math.floor(Math.random() * 2)],
        counterparty: {
          wallet: `0x${Math.random().toString(16).substr(2, 20)}${Math.random().toString(16).substr(2, 20)}`,
          telegram: `@user_${i + 6}`,
        },
        reference: `REF-2024-${String(i + 6).padStart(3, "0")}`,
        fee: Math.floor(Math.random() * 100) + 10,
        net: Math.floor(Math.random() * 4900) + 90,
      }
    }),
  ]

  // Calcular volumen mensual de USDC en los últimos 30 días
  const monthlyVolume = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const volumeUSDC = allTransactions
      .filter((transaction) => {
        const txDate = new Date(transaction.timestamp)
        return txDate >= thirtyDaysAgo && transaction.status === "finalizado" && transaction.cryptoCurrency === "USDC"
      })
      .reduce((total, transaction) => total + transaction.cryptoAmount, 0)

    return new Intl.NumberFormat("es-ES", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(volumeUSDC)
  }, [allTransactions.length])

  // NUEVA LÓGICA: Transacciones completadas (últimos 30 días)
  const completedTransactionsCount = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return allTransactions.reduce((count, transaction) => {
      if (transaction.status === "finalizado") {
        const txDate = new Date(transaction.timestamp)
        if (txDate >= thirtyDaysAgo) {
          return count + 1
        }
      }
      return count
    }, 0)
  }, [allTransactions.length])

  // NUEVA LÓGICA: Órdenes en proceso
  const ordersInProcessCount = useMemo(() => {
    const processStatuses = ["iniciada", "en custodia", "pagado", "apelado"]

    return allTransactions.reduce((count, transaction) => {
      if (processStatuses.includes(transaction.status)) {
        return count + 1
      }
      return count
    }, 0)
  }, [allTransactions.length])

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
  }, [currentPage, loading, hasMore, searchTerm, statusFilter, operationFilter, dateRange, sortConfig, initialLoad])

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
        {/* Stats Cards - Con redondeo correcto en la intersección */}
        <div className="grid md:grid-cols-2 border border-gray-200 overflow-hidden">
          <Card className="bg-white border-0 rounded-none border-r border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-3">
              <CardTitle className="text-base font-semibold">Volumen Mensual (últimos 30 días)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-5">
              <div className="text-2xl font-bold text-paydece-blue">{monthlyVolume} USDC</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 rounded-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-3">
              <CardTitle className="text-base font-semibold">Transacciones completadas (últimos 30 días)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-5">
              <div className="text-2xl font-bold text-paydece-blue">{completedTransactionsCount}</div>
              <p className="text-base text-muted-foreground">{ordersInProcessCount} órdenes en proceso</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Sin espaciado superior */}
        <Card className="paydece-card rounded-none border-l border-r border-gray-200">
          <CardHeader className="pb-2 px-5 pt-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex items-center gap-2 rounded-full text-sm px-3 py-1.5 h-8"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpiar filtros
                </Button>
                <Button
                  onClick={downloadSummary}
                  className="bg-black text-white font-medium rounded-full transition-all hover:opacity-90 flex items-center gap-2 text-sm px-3 py-1.5 h-8"
                >
                  <Download className="h-3 w-3" />
                  Descargar resumen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Escribe 3 letras"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 rounded-full text-sm h-8 focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Estado
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-full text-sm h-8 focus:ring-gray-500 focus:border-gray-500">
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
              <div className="space-y-2">
                <Label htmlFor="operation" className="text-sm font-medium">
                  Operación
                </Label>
                <Select value={operationFilter} onValueChange={handleOperationFilterChange}>
                  <SelectTrigger className="rounded-full text-sm h-8 focus:ring-gray-500 focus:border-gray-500">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Fecha
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-full text-sm h-8 focus:ring-gray-500 focus:border-gray-500",
                        !dateRange.from && !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
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
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table - Sin espaciado superior */}
        <Card className="paydece-card rounded-bl-xl rounded-br-xl rounded-tl-none rounded-tr-none border-t-0 border-gray-200 flex-1">
          <CardContent className="p-0 h-full">
            <div className="overflow-hidden h-full">
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

              {/* Indicadores de carga y estado MEJORADOS */}
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
      </div>
    </div>
  )
}
