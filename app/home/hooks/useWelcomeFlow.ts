import { useState, useEffect } from 'react'
import { seedInitialData, SeedingProgress, hasInitialData } from '../services/dataSeedingService'
import { elementStore, sectionStore } from '../clients/Database'

interface WelcomeFlowState {
  showWelcome: boolean
  showSetupOptions: boolean
  isLoading: boolean
  progress?: SeedingProgress
  error?: string
}

export function useWelcomeFlow() {
  const [state, setState] = useState<WelcomeFlowState>({
    showWelcome: false,
    showSetupOptions: true,
    isLoading: false
  })

  // Get data from stores to check if user has initial data
  const [elementsHydrated, elements] = elementStore.useList()
  const [sectionsHydrated, sections] = sectionStore.useList()

  useEffect(() => {
    if (elementsHydrated && sectionsHydrated) {
      const userHasData = hasInitialData(elementsHydrated, elements, sectionsHydrated, sections)

      if (!userHasData) {
        // New user - show welcome dialog
        setState(prev => ({
          ...prev,
          showWelcome: true,
          showSetupOptions: true
        }))
      } else {
        // User has data - hide welcome dialog
        setState(prev => ({
          ...prev,
          showWelcome: false,
        }))
      }
    }
  }, [elementsHydrated, sectionsHydrated, elements.length, sections.length])

  const handleStartSetup = async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      showSetupOptions: false,
      error: undefined
    }))

    try {
      await seedInitialData((progress) => {
        setState(prev => ({
          ...prev,
          progress
        }))
      })

      // Wait a moment to show completion state
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false
        }))
      }, 1500)

    } catch (error: any) {
      console.error('[useWelcomeFlow] Error seeding data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set up initial data',
        showSetupOptions: true
      }))
    }
  }

  const handleSkipSetup = () => {
    setState(prev => ({
      ...prev,
      showWelcome: false
    }))
  }

  const handleCloseWelcome = () => {
    setState(prev => ({
      ...prev,
      showWelcome: false
    }))
  }

  return {
    ...state,
    handleStartSetup,
    handleSkipSetup,
    handleCloseWelcome
  }
}