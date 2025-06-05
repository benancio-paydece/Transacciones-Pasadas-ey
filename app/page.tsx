"use client"

import { TopNavigation } from "../components/top-navigation"
import TransactionsTab from "../transactions-tab"

export default function Page() {
  return (
    <div className="h-full flex flex-col">
      <TopNavigation />
      <div className="flex-1 overflow-hidden">
        <TransactionsTab />
      </div>
    </div>
  )
}
