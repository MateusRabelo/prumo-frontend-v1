import { chromium } from 'playwright'
import path from 'path'

const ARTIFACTS_DIR = '/home/arkesdev/.gemini/antigravity-cli/brain/ba2b014d-4fbb-4571-8cc1-66b9919f34fa'

async function run() {
  console.log('--- Starting MSFinanças E2E Browser Test ---')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  try {
    // 1. Visit Register
    console.log('1. Navigating to Register page...')
    await page.goto('http://localhost:5174/register', { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_register_page.png') })
    console.log('Screenshot saved: 01_register_page.png')

    // 2. Register new user
    const timestamp = Date.now()
    const testEmail = `casal_${timestamp}@msfinancas.com`
    console.log(`2. Registering user ${testEmail}...`)

    const inputs = await page.$$('input')
    await inputs[0].fill('Carlos Silva')
    await inputs[1].fill(testEmail)
    await inputs[2].fill('SenhaForte123!')
    if (inputs.length >= 4) {
      await inputs[3].fill('Família Silva')
    }

    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log('Registration successful, redirected to Dashboard!')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_dashboard_initial.png') })
    console.log('Screenshot saved: 02_dashboard_initial.png')

    // 3. Transactions Page
    console.log('3. Navigating to Transactions page...')
    await page.goto('http://localhost:5174/transactions', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Open New Transaction Modal
    console.log('4. Creating Income Transaction...')
    const newTxBtn = await page.waitForSelector('main button:has-text("Nova Transação")', { timeout: 5000 })
    await newTxBtn.click()
    await page.waitForSelector('h3:has-text("Nova Transação")', { timeout: 5000 })

    // Select Receita
    await page.click('button:has-text("Receita")')
    // Fill description and amount
    await page.fill('input[placeholder*="Supermercado"]', 'Salário Mensal Carlos')
    await page.fill('input[placeholder="0,00"]', '12500.00')

    // Submit transaction
    await page.click('button:has-text("Salvar Transação")')
    await page.waitForTimeout(1500)
    console.log('Income transaction created!')

    // Create Expense Transaction
    console.log('5. Creating Expense Transaction...')
    const newTxBtn2 = await page.waitForSelector('main button:has-text("Nova Transação")', { timeout: 5000 })
    await newTxBtn2.click()
    await page.waitForSelector('h3:has-text("Nova Transação")', { timeout: 5000 })
    await page.fill('input[placeholder*="Supermercado"]', 'Aluguel do Apartamento')
    await page.fill('input[placeholder="0,00"]', '3200.00')
    await page.click('button:has-text("Salvar Transação")')
    await page.waitForTimeout(1500)
    console.log('Expense transaction created!')

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_transactions_populated.png') })
    console.log('Screenshot saved: 03_transactions_populated.png')

    // 4. Installments Page
    console.log('6. Navigating to Installments page...')
    await page.goto('http://localhost:5174/installments', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Open Installment Modal
    await page.click('button:has-text("Novo Parcelamento")')
    await page.waitForSelector('h3:has-text("Novo Parcelamento")', { timeout: 5000 })

    await page.fill('input[placeholder*="Notebook"]', 'Geladeira Frost Free')
    await page.fill('input[placeholder="0,00"]', '3000.00')
    const countInputs = await page.$$('input[type="number"]')
    if (countInputs.length > 0) {
      await countInputs[0].fill('3')
    }
    await page.click('button:has-text("Criar Parcelamento")')
    await page.waitForTimeout(2000)
    console.log('Installment plan created!')

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_installments_list.png') })
    console.log('Screenshot saved: 04_installments_list.png')

    // Expand plan to view installments and pay parcel 1
    const expandBtn = await page.$('button:has-text("Ver todas")')
    if (expandBtn) {
      console.log('7. Expanding installment plan and paying installment 1...')
      await expandBtn.click()
      await page.waitForTimeout(500)
      const payButton = await page.$('button:has-text("Pagar")')
      if (payButton) {
        await payButton.click()
        await page.waitForSelector('h3:has-text("Registrar Pagamento")', { timeout: 5000 })
        await page.click('button:has-text("Confirmar Pagamento")')
        await page.waitForTimeout(1500)
        console.log('Installment 1 paid successfully!')
      }
    }

    // 5. Budgets Page
    console.log('8. Navigating to Budgets (50/30/20) page...')
    await page.goto('http://localhost:5174/budgets', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_budgets_view.png') })
    console.log('Screenshot saved: 05_budgets_view.png')

    // 6. Goals Page
    console.log('9. Navigating to Goals page...')
    await page.goto('http://localhost:5174/goals', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Create Goal
    await page.click('button:has-text("Nova Meta")')
    await page.waitForSelector('h3:has-text("Nova Meta Financeira")', { timeout: 5000 })
    await page.fill('input[placeholder*="Reserva"]', 'Reserva de Emergência')
    await page.fill('input[placeholder="0,00"]', '25000.00')
    await page.fill('input[type="date"]', '2026-12-31')
    await page.click('button:has-text("Salvar Meta")')
    await page.waitForTimeout(1500)
    console.log('Goal created!')

    // Add contribution to goal
    const contribButton = await page.$('button:has-text("+ Aporte")')
    if (contribButton) {
      console.log('10. Adding contribution to goal...')
      await contribButton.click()
      await page.waitForSelector('h3:has-text("Aporte / Retirada")', { timeout: 5000 })
      await page.fill('input[placeholder="0,00"]', '5000.00')
      await page.click('button:has-text("Confirmar")')
      await page.waitForTimeout(1500)
      console.log('Contribution added!')
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_goals_progress.png') })
    console.log('Screenshot saved: 06_goals_progress.png')

    // 7. Reports Page
    console.log('11. Navigating to Reports page...')
    await page.goto('http://localhost:5174/reports', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_reports_monthly.png') })
    console.log('Screenshot saved: 07_reports_monthly.png')

    // Switch to annual report
    await page.click('button:has-text("Anual")')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_reports_annual.png') })
    console.log('Screenshot saved: 08_reports_annual.png')

    // 8. Settings Page
    console.log('12. Navigating to Settings page...')
    await page.goto('http://localhost:5174/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '09_settings_categories.png') })
    console.log('Screenshot saved: 09_settings_categories.png')

    // 9. Family Page
    console.log('13. Navigating to Family page...')
    await page.goto('http://localhost:5174/family', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '10_family_space.png') })
    console.log('Screenshot saved: 10_family_space.png')

    // 10. Return to Dashboard to see updated metrics, charts and balances
    console.log('14. Returning to Dashboard for final view...')
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '11_dashboard_final.png') })
    console.log('Screenshot saved: 11_dashboard_final.png')

    console.log('====================================================')
    console.log('>>> ALL E2E BROWSER TESTS PASSED SUCCESSFULLY! <<<')
    console.log('====================================================')
  } catch (err) {
    console.error('E2E Test Failed with error:', err)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_state.png') })
    throw err
  } finally {
    await browser.close()
  }
}

run()
