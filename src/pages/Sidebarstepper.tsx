import React from "react";

interface SidebarStepperProps {
  steps: { label: string; icon: React.ReactNode }[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

const SidebarStepper: React.FC<SidebarStepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "row", 
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      gap: "1rem",
      position: "relative",
      padding: "0.5rem 0"
    }}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;

        return (
          <div
            key={index}
            onClick={() => onStepClick(stepNum)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontWeight: isActive ? "600" : "400",
              color: isActive ? "#fb923c" : isCompleted ? "#fb923c" : "#6b7280",
              position: "relative",
              flex: 1,
              minWidth: "0",
            }}
          >
            {/* Icon wrapper */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: isActive
                  ? "#fed7aa"
                  : isCompleted
                  ? "#fed7aa"
                  : "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: isActive ? "2px solid #fb923c" : "1px solid #d1d5db",
                position: "relative",
                zIndex: 2,
                flexShrink: 0,
              }}
            >
              <div style={{ transform: "scale(1.1)" }}>
                {step.icon}
              </div>
            </div>
            
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "48px",
                  top: "24px",
                  width: "calc(100% + 1rem)",
                  height: "2px",
                  backgroundColor: isCompleted ? "#fb923c" : "#d1d5db",
                  zIndex: 1,
                }}
              />
            )}
            
            <span style={{ fontSize: "0.9rem", textAlign: "center", lineHeight: "1.2" }}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SidebarStepper;
