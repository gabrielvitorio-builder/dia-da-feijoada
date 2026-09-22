export default function QuantityStepper({ qty, onIncrement, onDecrement }) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={onDecrement}
        disabled={qty === 0}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span className="stepper__count">{qty}</span>
      <button type="button" className="stepper__btn" onClick={onIncrement} aria-label="Aumentar quantidade">
        +
      </button>
    </div>
  )
}
