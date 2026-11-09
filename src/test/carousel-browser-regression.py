"""Run with python3 src/test/carousel-browser-regression.py against local preview."""
import asyncio
from playwright.async_api import async_playwright

async def check(carousel, page):
    await carousel.scroll_into_view_if_needed()
    picker = carousel.get_by_label('Choose photo')
    styles = await picker.evaluate("e => ({width:getComputedStyle(e).scrollbarWidth, webkit:getComputedStyle(e,'::-webkit-scrollbar').display, overflow:getComputedStyle(e).overflowX})")
    assert styles['width'] == 'none' and styles['webkit'] == 'none'
    assert styles['overflow'] == 'auto'
    dots = picker.get_by_role('button')
    total = await dots.count()
    assert total > 1
    await carousel.get_by_role('button', name='Next photo', exact=True).click()
    await page.wait_for_timeout(500)
    assert await dots.nth(1).get_attribute('aria-current') == 'true'
    last = dots.nth(total - 1)
    await last.focus()
    assert await last.evaluate('e => e === document.activeElement')
    await page.keyboard.press('Enter')
    await page.wait_for_timeout(500)
    assert await last.get_attribute('aria-current') == 'true'
    await carousel.focus()
    await page.keyboard.press('ArrowRight')
    await page.wait_for_timeout(500)
    assert await dots.nth(0).get_attribute('aria-current') == 'true'
    print('scrollbars hidden; arrows, last-dot focus/Enter and keyboard wrap pass:', total)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width':1280,'height':1800})
        for viewport in [{'width':1280,'height':1800}, {'width':390,'height':844}]:
            await page.set_viewport_size(viewport)
            await page.goto('http://localhost:8080', wait_until='networkidle')
            for deal in ['6','8','40']:
                await check(page.locator(f'article[data-deal-id="{deal}"]').get_by_role('region'), page)
            for deal in ['6','8','40']:
                await page.goto(f'http://localhost:8080/deal/{deal}', wait_until='networkidle')
                await check(page.locator('header').get_by_role('region'), page)
        await browser.close()

asyncio.run(main())
