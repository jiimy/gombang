import React from 'react'

type ModalTitleType = {
  children: React.ReactNode
}

const ModalTitle = ({ children }: ModalTitleType) => {
  return (
    <div className='text-3xl mb-16 font-bold'>
      {children}
    </div>
  )
}

export default ModalTitle