"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Datos de transacciones (copiados directamente aquí para evitar problemas de import)
const allTransactions = [
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
  {
    id: "TXN-006",
    date: "13/12/2024",
    time: "08:30",
    timestamp: new Date("2024-12-13T08:30:00Z").getTime(),
    cryptoAmount: 750.0,
    cryptoCurrency: "USDC",
    fiatAmount: 750.0,
    fiatCurrency: "USD",
    status: "finalizado",
    operation: "venta",
    counterparty: {
      wallet: "0x4444444444444444444444444444444444444444",
      telegram: "@diego_hodl",
    },
    reference: "REF-2024-006",
    fee: 22.5,
    net: 727.5,
  },
  {
    id: "TXN-007",
    date: "16/12/2024",
    time: "10:15",
    timestamp: new Date("2024-12-16T10:15:00Z").getTime(),
    cryptoAmount: 1800.0,
    cryptoCurrency: "USDC",
    fiatAmount: 1620.0,
    fiatCurrency: "EUR",
    status: "finalizado",
    operation: "compra",
    counterparty: {
      wallet: "0x8888888888888888888888888888888888888888",
      telegram: "@pedro_crypto",
    },
    reference: "REF-2024-007",
    fee: 54.0,
    net: 1746.0,
  },
  // Agregamos más transacciones para simular scroll infinito con fechas recientes
  ...Array.from({ length: 100 }, (_, i) => {
    const randomDaysAgo = Math.floor(Math.random() * 25) + 1 // Entre 1 y 25 días atrás
    const date = new Date()
    date.setDate(date.getDate() - randomDaysAgo)

    return {
      id: `TXN-${String(i + 8).padStart(3, "0")}`,
      date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
      time: `${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
      timestamp: date.getTime(),
      cryptoAmount: Math.floor(Math.random() * 5000) + 100,
      cryptoCurrency: "USDC",
      fiatAmount: Math.floor(Math.random() * 5000000) + 100000,
      fiatCurrency: ["ARS", "EUR", "USD"][Math.floor(Math.random() * 3)],
      status: [
        "iniciada",
        "en custodia",
        "pagado",
        "finalizado",
        "cancelado",
        "reembolsado",
        "apelado",
        "liberado",
        "transferido",
      ][Math.floor(Math.random() * 9)],
      operation: ["compra", "venta"][Math.floor(Math.random() * 2)],
      counterparty: {
        wallet: `0x${Math.random().toString(16).substr(2, 20)}${Math.random().toString(16).substr(2, 20)}`,
        telegram: `@user_${i + 8}`,
      },
      reference: `REF-2024-${String(i + 8).padStart(3, "0")}`,
      fee: Math.floor(Math.random() * 100) + 10,
      net: Math.floor(Math.random() * 4900) + 90,
    }
  }),
]

// Función para formatear fecha y hora en zona horaria local
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "iniciada":
      return <Badge className="paydece-badge-blue">Iniciada</Badge>
    case "en-custodia":
    case "en custodia":
      return <Badge className="paydece-badge-orange">En Custodia</Badge>
    case "pagado":
      return <Badge className="paydece-badge-green">Pagado</Badge>
    case "finalizado":
      return <Badge className="paydece-badge-green">Finalizado</Badge>
    case "cancelado":
      return <Badge className="paydece-badge-red">Cancelado</Badge>
    case "reembolsado":
      return <Badge className="paydece-badge-purple">Reembolsado</Badge>
    case "apelado":
      return <Badge className="paydece-badge-yellow">Apelado</Badge>
    case "liberado":
      return <Badge className="paydece-badge-gray">Liberado</Badge>
    case "transferido":
      return <Badge className="paydece-badge-blue">Transferido</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const getOperationBadge = (operation: string) => {
  switch (operation) {
    case "compra":
      return <Badge className="paydece-badge-green">Compra</Badge>
    case "venta":
      return <Badge className="paydece-badge-blue">Venta</Badge>
    default:
      return <Badge variant="secondary">{operation}</Badge>
  }
}

export default function TransactionDetail() {
  const params = useParams()
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Simular carga de datos
    setLoading(true)
    setTimeout(() => {
      const id = params.id as string
      const foundTransaction = allTransactions.find((t) => t.id === id)
      setTransaction(foundTransaction || null)
      setLoading(false)
    }, 500)
  }, [params.id])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBack = () => {
    window.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paydece-gradient flex items-center justify-center">
        <Card className="paydece-card w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-pulse h-8 w-64 bg-gray-200 rounded"></div>
              <div className="animate-pulse h-4 w-48 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-paydece-gradient flex items-center justify-center">
        <Card className="paydece-card w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <h1 className="text-2xl font-bold text-paydece-blue">Transacción no encontrada</h1>
              <p className="text-muted-foreground">La transacción que buscas no existe o ha sido eliminada.</p>
              <Button onClick={handleBack} className="paydece-button-secondary mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cerrar pestaña
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const localDateTime = formatLocalDateTime(transaction.timestamp)

  return (
    <div className="min-h-screen bg-paydece-gradient">
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        {/* Header con logo */}
        <div className="mb-6">
          <Image src="/paydece-logo.png" alt="Paydece Logo" width={240} height={64} className="h-16 w-auto" />
        </div>

        {/* Botón de regreso */}
        <Button onClick={handleBack} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cerrar pestaña
        </Button>

        {/* Tarjeta principal */}
        <Card className="paydece-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <CardTitle className="text-xl font-bold text-paydece-blue">Transacción {transaction.id}</CardTitle>
              <div className="flex items-center gap-2">
                {getOperationBadge(transaction.operation)}
                {getStatusBadge(transaction.status)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Fecha y hora</h3>
                  <p className="text-base font-medium">
                    {localDateTime.date} {localDateTime.time} {localDateTime.utc}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Referencia</h3>
                  <p className="text-base font-medium">{transaction.reference}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Monto Cripto</h3>
                  <p className="text-base font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(transaction.cryptoAmount)}{" "}
                    {transaction.cryptoCurrency}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Monto FIAT</h3>
                  <p className="text-base font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(transaction.fiatAmount)}{" "}
                    {transaction.fiatCurrency}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Información de contraparte */}
            <div>
              <h3 className="text-base font-medium mb-3">Información de contraparte</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet</p>
                    <p className="text-sm font-medium">{transaction.counterparty.wallet}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(transaction.counterparty.wallet)}
                    className="h-8 px-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Telegram</p>
                    <p className="text-sm font-medium">{transaction.counterparty.telegram}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(transaction.counterparty.telegram)}
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(`https://t.me/${transaction.counterparty.telegram.substring(1)}`, "_blank")
                      }
                      className="h-8 px-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Detalles financieros */}
            <div>
              <h3 className="text-base font-medium mb-3">Detalles financieros</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Monto bruto</p>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(transaction.cryptoAmount)}{" "}
                    {transaction.cryptoCurrency}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Comisión</p>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(transaction.fee)}{" "}
                    {transaction.cryptoCurrency}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Monto neto</p>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "decimal",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(transaction.net)}{" "}
                    {transaction.cryptoCurrency}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline">Descargar comprobante</Button>
              {transaction.status === "iniciada" && (
                <Button className="paydece-button-secondary">Cancelar transacción</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
