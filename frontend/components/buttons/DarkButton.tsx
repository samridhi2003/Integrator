import React, { ReactNode } from 'react'

export const DarkButton = ({ children, onClick, size = "small" }: {
    children: ReactNode,
    onClick: () => void,
    size?: "small" | "big"
}) => {
    return <div onClick={onClick} className={ `flex flex-col justify-center px-8 py-2
     hover:shadow-md cursor-pointer bg-purple-800 text-white rounded text-center`}>
        {children}
        </div>
}
