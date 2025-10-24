import React, { useState, useMemo } from 'react'
import { modulesData as mockModulesData } from './InputSearch.mock'
import { Inbox, Search } from 'lucide-react'
import type { Permiso } from '@renderer/type/auth.type';
import './InputSearch.scss'

// Tipos base

export interface ModuleItem {
    id: number | string
    title: string
    desc?: string
}

export interface ModulesDataProps {
    [modulo: string]: ModuleItem[]
}

interface SearchResult extends ModuleItem {
    modulo: string
}

interface InputSearchProps {
    permissions: Permiso[]
    modulesData?: ModulesDataProps // <- ahora opcional
    onSelect?: (item: SearchResult) => void
}

const InputSearch: React.FC<InputSearchProps> = ({
    permissions,
    modulesData = mockModulesData, // <- valor por defecto corregido
    onSelect,
}) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [focus, setFocus] = useState<boolean>(false)

    // módulos permitidos según permisos
    const allowedModules = useMemo(() => {
        const uniqueModules = new Set(permissions.map(p => p.modulo))
        return Array.from(uniqueModules)
    }, [permissions])

    const handleSearch = (value: string) => {
        setQuery(value)

        if (!value.trim()) {
            setResults([])
            return
        }

        const filtered: SearchResult[] = allowedModules.flatMap(mod => {
            const items = modulesData[mod] || []
            return items
                .filter(i =>
                    i.title.toLowerCase().includes(value.toLowerCase()) ||
                    i.desc?.toLowerCase().includes(value.toLowerCase())
                )
                .map(i => ({ ...i, modulo: mod }))
        })

        setResults(filtered)
    }

    return (
        <div className='InputSearch'>
            <label htmlFor="search" className={`search ${focus ? 'active' : ''}`}>
                <Search />
                <input
                    id='search'
                    type="text"
                    value={query}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Buscar..."
                />
            </label>
            {query.length > 0 && (
                <div className={`result-search ${focus ? 'active' : ''}`}>
                    {results.length > 0 &&  <h2>Resultados</h2>}
                    {results.map((r, idx) => (
                        <div
                            key={idx}
                            onClick={() => onSelect?.(r)}
                        >
                            <div>{r.title}</div>
                            <div>Módulo: {r.modulo}</div>
                        </div>
                    ))}
                    {
                        results.length < 1 && (
                            <div className="notResult">
                                <p>Sin resultados</p>
                                <Inbox size={48}/>
                            </div>
                        )
                    }
                </div>
            )}
        </div>
    )
}

export default InputSearch
