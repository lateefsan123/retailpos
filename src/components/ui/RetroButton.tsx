import React from 'react'

interface RetroButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export const RetroButton: React.FC<RetroButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  style = {}
}) => {
  return (
    <>
      <style>{`
        @property --rotation {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .retro-button {
          --inset: 15px;
          --rad: 18px;
          /* background: rgb(255 255 255 / 0.3); */
          /* padding: var(--inset); */
          /* border-radius: calc(var(--rad) + var(--inset)); */
          border: none;
          position: relative;
          /* box-shadow: 0 4px 10px rgb(0 0 0 / 0.1); */
          cursor: pointer;
          font-family: "Poppins", sans-serif;
          font-optical-sizing: auto;
          font-weight: 600;
          font-style: normal;
        }

        /* .retro-button:before {
          --inset: -15px;
          content: "";
          display: block;
          background: conic-gradient(from var(--rotation), purple, blue, green, yellow, orange, red);
          filter: blur(20px);
          opacity: 1;
          position: absolute;
          inset: 10px;
          border-radius: calc(var(--rad) + calc(var(--inset) * -1));
          z-index: -2;
          animation: rotate 5s linear infinite;
        } */

        /* .retro-button:after {
          --inset: -15px;
          content: "";
          display: block;
          background: linear-gradient(
            to bottom,
            rgb(255 255 255 / 0.5) 0%,
            rgb(255 255 255 / 0.5) 2px,
            rgb(100 100 100 / 0.1) 30%,
            rgb(100 100 100 / 0.1) 70%,
            rgb(255 255 255 / 0.5) 99%,
            rgb(255 255 255 / 0.5) 100%
          );
          position: absolute;
          inset: -1.5px;
          border-radius: calc(var(--rad) + calc(var(--inset) * -1));
          z-index: -1;
        } */

        /* .retro-button:active:before {
          animation-play-state: paused;
          opacity: 1;
          scale: 0.9;
          filter: blur(10px);
        } */

        .retro-button:active .retro-cap {
          scale: 0.93;
        }

        .retro-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .retro-button:disabled:before {
          animation-play-state: paused;
        }

        .retro-cap {
          display: inline-block;
          background: linear-gradient(to bottom, #6b7280, #4b5563);
          border-radius: var(--rad);
          font-size: 16px;
          color: #fff;
          padding: 12px 20px;
          border: none;
          border-top: #9ca3af solid 1px;
          border-bottom: #374151 solid 1px;
          box-shadow: 0 8px 10px rgb(0 0 0 / 0.3);
          position: relative;
          transition: scale 0.1s ease-in-out;
        }

        .retro-text {
          border-radius: 50px;
          background: linear-gradient(to bottom, #4b5563, #6b7280);
          padding: 8px 20px;
          display: block;
        }

        @keyframes rotate {
          to {
            --rotation: 360deg;
          }
        }
      `}</style>
      <button
        className={`retro-button ${className}`}
        onClick={onClick}
        type={type}
        disabled={disabled}
        style={style}
      >
        <span className="retro-cap">
          <span className="retro-text">{children}</span>
        </span>
      </button>
    </>
  )
}
