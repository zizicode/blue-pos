import React from "react"
import { BrowserRouter, HashRouter } from "react-router-dom"

export const RouterProvider = ({ children }: { children: React.ReactNode }) => {
  const isProd = import.meta.env.MODE === 'production'

  // En build (Electron) => HashRouter
  // En dev => BrowserRouter
  return isProd
    ? <HashRouter>{children}</HashRouter>
    : <BrowserRouter>{children}</BrowserRouter>
}
