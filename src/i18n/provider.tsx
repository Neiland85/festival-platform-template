"use client"

type Messages = Record<string, unknown>

type Props = {
  children: React.ReactNode
  locale: string
  messages: Messages
}

export function IntlProvider({
  children,
}: Props) {
  return <>{children}</>
}
