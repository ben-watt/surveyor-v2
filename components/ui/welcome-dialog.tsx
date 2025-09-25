import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { SeedingProgress } from '@/app/home/services/dataSeedingService'

interface WelcomeDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  progress?: SeedingProgress
  onStartSetup: () => void
  onSkipSetup: () => void
  isLoading: boolean
  showSetupOptions: boolean
}

export function WelcomeDialog({
  open,
  onOpenChange,
  progress,
  onStartSetup,
  onSkipSetup,
  isLoading,
  showSetupOptions
}: WelcomeDialogProps) {
  const progressPercentage = progress
    ? (progress.currentStepIndex / progress.totalSteps) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to Survii!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {showSetupOptions && !progress && (
            <>
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  To get you started quickly, we can set up your account with sample survey data including:
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-900">Building Elements</div>
                    <div className="text-blue-700">Walls, roofs, floors, etc.</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-900">Components</div>
                    <div className="text-purple-700">Materials and fixtures</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-900">Inspection Phrases</div>
                    <div className="text-green-700">Common defects and conditions</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="font-medium text-orange-900">Survey Sections</div>
                    <div className="text-orange-700">Organized survey structure</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={onStartSetup}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Set Up Sample Data
                </Button>

                <Button
                  onClick={onSkipSetup}
                  variant="outline"
                  disabled={isLoading}
                  className="w-full"
                >
                  Start with Empty Account
                </Button>
              </div>

              <p className="text-xs text-center text-gray-500">
                You can always import sample data later from Settings
              </p>
            </>
          )}

          {progress && !progress.isComplete && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">Setting up your account</h3>
                <p className="text-sm text-gray-600 mt-1">{progress.currentStep}</p>
              </div>

              <div className="space-y-2">
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-xs text-center text-gray-500">
                  Step {progress.currentStepIndex} of {progress.totalSteps}
                </p>
              </div>
            </div>
          )}

          {progress && progress.isComplete && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900">Setup Complete!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your account is ready. You can start creating surveys right away.
                </p>
              </div>

              <Button
                onClick={() => onOpenChange?.(false)}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}