import React from 'react'

/** A labelled group of fields, so a long form reads as a few short ones. */
const FormSection = ({ title, description, children }) => (
  <section>
    <h3 className="m-0 mb-1 text-[11px] font-semibold tracking-[0.08em] text-[#5A636D] uppercase">
      {title}
    </h3>
    {description && <p className="m-0 mb-3 text-xs text-[#5A636D]">{description}</p>}
    <div className={description ? '' : 'mt-3'}>{children}</div>
  </section>
)

export default FormSection
