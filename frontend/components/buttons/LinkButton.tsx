import { on } from 'events'
import React, { ReactNode } from 'react'

export const LinkButton = ({ children, onClick }: {children: ReactNode, onClick: () => void}) => {
  return <div className='flex justify-center px-2 py-2 hover:bg-slate-100 font-light text-sm cursor-pointer rounded' onClick={onClick}>
    {children}
    </div>
}
