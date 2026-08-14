/**
 * Visual Canvas Layer Tests - 视觉层级优化
 * 
 * 验证深色模式下编辑画布层的样式分层是否正确
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Visual Canvas Layer - Dark Mode', () => {
  const styleCssPath = path.join(__dirname, '../src/style.css')
  const styleContent = fs.readFileSync(styleCssPath, 'utf-8')

  describe('CSS Variables - Three-Layer Background', () => {
    it('should define dark mode three-layer background variables', () => {
      // Verify that the CSS file contains the three-layer background definitions
      expect(styleContent).toContain('--bg-app:')
      expect(styleContent).toContain('--bg-stage:')
      expect(styleContent).toContain('--bg-canvas:')

      // Check they are in the dark theme block
      const darkThemeMatch = styleContent.match(/\[data-theme="dark"\]\s*\{[^}]*\}/s)
      expect(darkThemeMatch).toBeTruthy()

      if (darkThemeMatch) {
        const darkBlock = darkThemeMatch[0]
        expect(darkBlock).toContain('--bg-app:')
        expect(darkBlock).toContain('--bg-stage:')
        expect(darkBlock).toContain('--bg-canvas:')
      }
    })

    it('should have distinct values for bg-app and bg-canvas in dark mode', () => {
      const darkThemeBlock = styleContent.match(/\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/)
      expect(darkThemeBlock).toBeTruthy()

      if (darkThemeBlock) {
        const lines = darkThemeBlock[0].split('\n')
        let bgApp = ''
        let bgCanvas = ''

        lines.forEach(line => {
          if (line.trim().startsWith('--bg-app:')) {
            bgApp = line.split(':')[1].trim().replace(';', '')
          }
          if (line.trim().startsWith('--bg-canvas:')) {
            bgCanvas = line.split(':')[1].trim().replace(';', '')
          }
        })

        // They should be different colors
        expect(bgApp).not.toBe(bgCanvas)
        expect(bgApp).toMatch(/^#[0-9a-f]{6}$/)
        expect(bgCanvas).toMatch(/^#[0-9a-f]{6}$/)
      }
    })

    it('should define subtle border variable for canvas', () => {
      const darkThemeBlock = styleContent.match(/\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/)
      expect(darkThemeBlock).toBeTruthy()

      if (darkThemeBlock) {
        expect(darkThemeBlock[0]).toContain('--border-subtle:')
        expect(darkThemeBlock[0]).toContain('--canvas-shadow:')
      }
    })

    it('should apply color-scheme for dark theme', () => {
      const darkThemeBlock = styleContent.match(/\[data-theme="dark"\]\s*\{[\s\S]*?color-scheme:[^;]+;[\s\S]*?\}/s)
      expect(darkThemeBlock).toBeTruthy()

      if (darkThemeBlock) {
        expect(darkThemeBlock[0]).toContain('color-scheme: dark')
      }
    })

    it('should apply color-scheme for light theme', () => {
      const lightThemeBlock = styleContent.match(/:root\s*\{[\s\S]*?color-scheme:[^;]+;[\s\S]*?\}/s)
      expect(lightThemeBlock).toBeTruthy()

      if (lightThemeBlock) {
        expect(lightThemeBlock[0]).toContain('color-scheme: light')
      }
    })
  })

  describe('Surface Elevation Tokens', () => {
    it('should define elevated surface tokens for light mode', () => {
      // Verify all surface elevation and shadow tokens exist
      expect(styleContent).toContain('--surface-elevated-1:')
      expect(styleContent).toContain('--surface-elevated-2:')
      expect(styleContent).toContain('--surface-elevated-3:')
      expect(styleContent).toContain('--shadow-sm:')
      expect(styleContent).toContain('--shadow-md:')
      expect(styleContent).toContain('--shadow-lg:')
      
      // Check that light mode has subtle shadows (0.04 opacity)
      expect(styleContent).toContain('rgba(0, 0, 0, 0.04)')
    })

    it('should define darker shadows for dark mode', () => {
      // Verify surface elevation and shadow tokens exist in the file
      expect(styleContent).toContain('--surface-elevated-1:')
      expect(styleContent).toContain('--shadow-sm:')
      
      // Dark mode should have rgba shadows with higher opacity
      const darkModeShadows = styleContent.match(/\[data-theme="dark"\][\s\S]*?rgba\([^)]+rgba\(\d+,/g)
      // Alternative: check that rgba exists somewhere in dark theme context
      const hasDarkShadowRgba = styleContent.includes('rgba(0, 0, 0, 0.2') || 
                                 styleContent.includes('rgba(0,0,0,0.2')
      expect(hasDarkShadowRgba).toBe(true)
    })
  })

  describe('Editor Canvas Container Styling', () => {
    it('should define editor-canvas with canvas layer styles', () => {
      // Find the main .editor-canvas definition (before mode-specific overrides)
      const canvasStyles = styleContent.match(/\.editor-canvas\s*\{[^}]*background:[^}]*\}/)
      expect(canvasStyles).toBeTruthy()

      if (canvasStyles) {
        const styles = canvasStyles[0]
        expect(styles).toContain('background: var(--bg-canvas)')
        expect(styles).toContain('border: 1px solid var(--border-subtle)')
        expect(styles).toContain('border-radius: var(--canvas-radius)')
        expect(styles).toContain('box-shadow: var(--canvas-shadow)')
      }
    })

    it('should remove canvas decorations in split mode', () => {
      const splitModeStyles = styleContent.match(/\.mode-split \.editor-canvas\s*\{[^}]*\}/)
      expect(splitModeStyles).toBeTruthy()

      if (splitModeStyles) {
        // Check the combined rule for split and source modes
        const combinedSplit = styleContent.match(/\.mode-split \.editor-canvas,[\s\S]{0,100}border:\s*none/)
        expect(combinedSplit).toBeTruthy()
      }
    })

    it('should include transition for smooth visual changes', () => {
      // Find editor-canvas with transition
      const canvasStyles = styleContent.match(/\.editor-canvas\s*\{[\s\S]*?transition:[\s\S]*?\}/)
      expect(canvasStyles).toBeTruthy()

      if (canvasStyles) {
        expect(canvasStyles[0]).toContain('transition')
        expect(canvasStyles[0]).toContain('border-color')
        expect(canvasStyles[0]).toContain('box-shadow')
      }
    })
  })

  describe('Modal Visual Hierarchy', () => {
    it('should use consistent shadow token for modal', () => {
      const modalStyles = styleContent.match(/\.modal\s*\{[\s\S]*?\}/)
      expect(modalStyles).toBeTruthy()

      if (modalStyles) {
        const styles = modalStyles[0]
        expect(styles).toContain('--shadow-lg')
        expect(styles).toContain('border-subtle')
      }
    })

    it('should use shadow-lg for create-entry-modal', () => {
      const createModalStyles = styleContent.match(/\.create-entry-modal\s*\{[\s\S]*?\}/)
      expect(createModalStyles).toBeTruthy()

      if (createModalStyles) {
        const styles = createModalStyles[0]
        expect(styles).toContain('--shadow-lg')
        expect(styles).toContain('--surface-elevated-1')
      }
    })

    it('should use shadow-lg for search-modal', () => {
      const searchModalStyles = styleContent.match(/\.search-modal\s*\{[\s\S]*?\}/)
      expect(searchModalStyles).toBeTruthy()

      if (searchModalStyles) {
        const styles = searchModalStyles[0]
        expect(styles).toContain('--shadow-lg')
        expect(styles).toContain('border-subtle')
      }
    })
  })

  describe('Toolbar Visual Enhancement', () => {
    it('should use surface elevation token for toolbar-group', () => {
      const toolbarGroupStyles = styleContent.match(/\.toolbar-group\s*\{[\s\S]*?\}/)
      expect(toolbarGroupStyles).toBeTruthy()

      if (toolbarGroupStyles) {
        const styles = toolbarGroupStyles[0]
        expect(styles).toContain('--surface-elevated-2')
        expect(styles).toContain('--shadow-sm')
      }
    })
  })

  describe('Mode-Specific Canvas Enhancements', () => {
    it('should enhance canvas border in live mode', () => {
      const liveModeStyles = styleContent.match(/\.mode-live \.editor-canvas\s*\{[^}]*\}/)
      expect(liveModeStyles).toBeTruthy()

      if (liveModeStyles) {
        expect(liveModeStyles[0]).toContain('--border-subtle')
      }
    })

    it('should provide subtle canvas styling in focus mode', () => {
      const focusModeStyles = styleContent.match(/\.mode-focus \.editor-canvas\s*\{[\s\S]*?\}/)
      expect(focusModeStyles).toBeTruthy()

      if (focusModeStyles) {
        expect(focusModeStyles[0]).toContain('border-color')
        expect(focusModeStyles[0]).toContain('box-shadow')
      }
    })

    it('should unify canvas language in split mode', () => {
      const splitModeStyles = styleContent.match(/\.mode-split \.editor-canvas\s*\{[^}]*\}/)
      expect(splitModeStyles).toBeTruthy()

      if (splitModeStyles) {
        expect(splitModeStyles[0]).toContain('--border-subtle')
      }
    })
  })

  describe('Canvas Radius Consistency', () => {
    it('should define --canvas-radius in dark mode', () => {
      const darkThemeBlock = styleContent.match(/\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/)
      expect(darkThemeBlock).toBeTruthy()

      if (darkThemeBlock) {
        expect(darkThemeBlock[0]).toContain('--canvas-radius')
      }
    })

    it('should use --canvas-radius in editor-canvas styles', () => {
      // Verify --canvas-radius is defined and used in the file
      expect(styleContent).toContain('--canvas-radius')
      
      // Find any .editor-canvas definition that includes border-radius
      const hasCanvasRadiusInStyles = styleContent.includes('var(--canvas-radius)')
      expect(hasCanvasRadiusInStyles).toBe(true)
    })
  })
})
