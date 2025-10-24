import { Can } from '@renderer/hooks/Can'
import React, { ReactNode } from 'react'
import './Head.scss';

export interface buttonHead {
    label: string
    icon?: ReactNode
    className?: string
    private?: { module: string, action: string }
    onClick?: () => void
    disabled?: boolean
}

interface HeadProps {
    title: string
    subtitle?: string | ReactNode
    buttons?: buttonHead[]
}

const Head: React.FC<HeadProps> = ({ title = 'Custom', subtitle, buttons }) => {
    return (
        <div className='head__header'>
            <div className='head__title-section'>
                <h1 className='head__title'>{title}</h1>
                <p className='head__subtitle'>
                    {subtitle}
                </p>
            </div>

            <div className='head__actions'>

                {
                    buttons?.map((btn, i) => (
                        btn.private ? (
                            <Can module={btn.private.module} action={btn.private.action} key={i}>
                                <button
                                    className={`btn btn-sm ${btn.className}`}
                                    onClick={btn.onClick}
                                    disabled={btn.disabled}
                                >
                                    {btn.icon}{btn.label}
                                </button>
                            </Can>
                        )
                            :
                            <button
                            key={i}
                                className={`btn btn-sm ${btn.className}`}
                                onClick={btn.onClick}
                                disabled={btn.disabled}
                            >
                                {btn.icon}{btn.label}
                            </button>
                    ))
                }
            </div>
        </div>
    )
}

export default Head