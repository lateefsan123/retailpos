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
      flexDirection: "column", 
      justifyContent: "space-evenly",
      height: "100%",
      gap: "2rem",
      position: "relative"
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
              alignItems: "center",
              gap: "1rem",
              cursor: "pointer",
              fontWeight: isActive ? "600" : "400",
              color: isActive ? "#7d8d86" : isCompleted ? "#16a34a" : "#6b7280",
              position: "relative",
            }}
          >
            {/* Icon wrapper */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: isActive
                  ? "#f1f0e4"
                  : isCompleted
                  ? "#dcfce7"
                  : "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: isActive ? "2px solid #7d8d86" : "1px solid #d1d5db",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div style={{ transform: "scale(1.3)" }}>
                {step.icon}
              </div>
            </div>
            
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "28px",
                  top: "56px",
                  width: "2px",
                  height: "calc(100% + 2rem)",
                  backgroundColor: isCompleted ? "#16a34a" : "#d1d5db",
                  zIndex: 1,
                }}
              />
            )}
            
            <span style={{ fontSize: "1.2rem" }}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SidebarStepper;
