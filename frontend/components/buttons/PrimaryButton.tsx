import React, { ReactNode } from 'react'

export const PrimaryButton = ({ children, onClick, size = "small" }: {
    children: ReactNode,
    onClick: () => void,
    size?: "small" | "big"
}) => {
    return <div onClick={onClick} className={ `${size === "small" ? "text-sm" : "text-xl"} 
    ${size === "small" ? "px-8 pt-2" : "px-14 py-2"} hover:shadow-md 
    cursor-pointer bg-amber-700 text-white rounded-full text-center`}>
        {children}
        </div>
}
