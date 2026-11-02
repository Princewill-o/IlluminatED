import XCTest
#if SWIFT_PACKAGE
@testable import IlluminatEDCore
#else
@testable import IlluminatED
#endif

final class PlatformPolicyTests: XCTestCase {
    let policy = PlatformPolicy()

    func testHostAndTransportBoundary() throws {
        for value in ["https://www.illumed.co.uk/games/world", "https://illumed.co.uk/sign-in", "https://www.illumed.co.uk:443/me"] {
            XCTAssertTrue(policy.isTrusted(try XCTUnwrap(URL(string: value))))
        }
        for value in ["http://www.illumed.co.uk/me", "https://illumed.co.uk.evil.test/", "https://evil.test/?next=https://illumed.co.uk", "https://user:secret@illumed.co.uk/", "https://illumed.co.uk:8443/"] {
            XCTAssertFalse(policy.isTrusted(try XCTUnwrap(URL(string: value))))
        }
    }

    func testNavigationDoesNotRouteDigitalPurchasesToBrowser() throws {
        for path in ["/premium", "/pricing", "/billing", "/premium/success", "/games/expansions"] {
            XCTAssertEqual(policy.decision(for: try XCTUnwrap(URL(string: "https://www.illumed.co.uk" + path))), .subscription)
        }
        XCTAssertEqual(policy.decision(for: try XCTUnwrap(URL(string: "https://checkout.stripe.com/c/pay/test"))), .subscription)
        XCTAssertEqual(policy.decision(for: try XCTUnwrap(URL(string: "https://www.aqa.org.uk/"))), .external)
        XCTAssertEqual(policy.decision(for: try XCTUnwrap(URL(string: "javascript:alert(1)"))), .deny)
        XCTAssertEqual(policy.decision(for: try XCTUnwrap(URL(string: "file:///tmp/token"))), .deny)
    }

    func testOnlyKnownDeepLinkScreensAreAccepted() throws {
        XCTAssertEqual(policy.deepLink(try XCTUnwrap(URL(string: "illuminated://open?screen=study")))?.path, "/games/study")
        for value in ["illuminated://open?screen=https://evil.test", "illuminated://open?screen=study&token=secret", "illuminated://auth?code=secret"] {
            XCTAssertNil(policy.deepLink(try XCTUnwrap(URL(string: value))))
        }
        for path in ["//evil.test", "/\\evil.test", "https://evil.test", "/premium"] { XCTAssertNil(policy.platformURL(path: path)) }
        XCTAssertNotNil(policy.platformURL(path: "/dashboard/settings#delete"))
    }
}

final class FocusSessionTests: XCTestCase {
    func testTimerKeepsAbsoluteTimeAcrossBackgroundAndRestart() {
        let start = Date(timeIntervalSince1970: 1000)
        let session = FocusSession(minutes: 15, now: start)
        XCTAssertEqual(session.remaining(at: start), 900)
        XCTAssertEqual(session.remaining(at: start.addingTimeInterval(450)), 450)
        XCTAssertTrue(session.complete(at: start.addingTimeInterval(900)))
        XCTAssertEqual(session.remaining(at: start.addingTimeInterval(1000)), 0)
        XCTAssertTrue(session.valid)
    }

    func testBadDurationsAreClampedAndReceiptSurvivesCoding() throws {
        let session = FocusSession(minutes: 999)
        XCTAssertEqual(session.minutes, 60)
        XCTAssertEqual(FocusSession(minutes: -3).minutes, 1)
        XCTAssertEqual(try JSONDecoder().decode(FocusSession.self, from: JSONEncoder().encode(session)), session)
    }
}

final class RevisionTests: XCTestCase {
    func question(id: String, subject: String, answer: Int = 0) -> RevisionQuestion {
        RevisionQuestion(id: id, subject: subject, course: "GCSE", topic: "Recall", prompt: "Question?", options: ["A", "B"], answer: answer, explanation: "Because A.")
    }

    func testSessionsFilterValidateAndDoNotDuplicateQuestions() {
        let bank = [question(id: "a", subject: "Maths"), question(id: "b", subject: "Biology"), question(id: "c", subject: "Maths", answer: 99)]
        let chosen = RevisionSession.questions(from: bank, subject: "Maths", limit: 5)
        XCTAssertEqual(chosen.map(\.id), ["a"])
        XCTAssertEqual(RevisionSession.questions(from: bank, subject: nil).count, 2)
        XCTAssertTrue(RevisionSession.questions(from: bank, subject: nil, limit: -1).isEmpty)
    }

    func testResultsRepresentScoresWithoutOnlineRewards() {
        let result = RevisionResult(id: UUID(), date: .now, subject: "Mixed", correct: 3, total: 5)
        XCTAssertTrue(result.valid)
        XCTAssertEqual(result.percentage, 60)
        XCTAssertFalse(RevisionResult(id: UUID(), date: .now, subject: "Mixed", correct: 5, total: 0).valid)
    }
}
