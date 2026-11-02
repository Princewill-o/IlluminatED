import XCTest

final class IlluminatEDUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launch()
        let welcome = app.buttons["welcome.continue"]
        if welcome.waitForExistence(timeout: 3) { welcome.tap() }
        return app
    }

    func testOfflineRevisionCanFinishAndSaveAFlashcard() {
        let app = launch()
        app.tabBars.buttons["Revise"].tap()
        app.buttons["revision.mixed"].tap()
        for index in 0..<5 {
            let answer = app.buttons["revision.option.0"]
            XCTAssertTrue(answer.waitForExistence(timeout: 5))
            answer.tap()
            if index == 0 {
                let save = app.buttons["Save as a flashcard"]
                app.swipeUp()
                if save.exists { save.tap() }
            }
            let next = app.buttons["revision.next"]
            if !next.isHittable { app.swipeUp() }
            next.tap()
            app.swipeDown()
        }
        XCTAssertTrue(app.staticTexts["revision.result"].waitForExistence(timeout: 5))
        app.buttons["Finish"].tap()
        app.tabBars.buttons["Today"].tap()
        XCTAssertTrue(app.staticTexts["Offline sessions"].exists)
    }

    func testFocusAndAccountSettingsAreAvailableWithoutSigningIn() {
        let app = launch()
        app.tabBars.buttons["Focus"].tap()
        app.buttons["focus.start"].tap()
        XCTAssertTrue(app.buttons["End this session"].waitForExistence(timeout: 5))
        app.buttons["End this session"].tap()
        app.buttons["End without adding focus time"].tap()
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(app.buttons["My platform account"].exists)
        XCTAssertTrue(app.switches["Daily study reminder"].exists)
    }
}
