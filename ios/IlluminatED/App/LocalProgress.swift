import SwiftUI

@MainActor
final class LocalProgress: ObservableObject {
    @Published private(set) var results: [RevisionResult] = []
    @Published private(set) var savedQuestions: Set<String> = []
    @Published private(set) var focus: FocusSession?
    @Published private(set) var focusMinutes = 0
    @Published private(set) var completedFocusIDs: Set<UUID> = []
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let data = defaults.data(forKey: "revision.results"), let stored = try? JSONDecoder().decode([RevisionResult].self, from: data) {
            results = Array(stored.filter(\.valid).prefix(100))
        }
        savedQuestions = Set(defaults.stringArray(forKey: "revision.saved") ?? [])
        focusMinutes = max(0, defaults.integer(forKey: "focus.minutes"))
        completedFocusIDs = Set((defaults.stringArray(forKey: "focus.completed") ?? []).compactMap(UUID.init(uuidString:)))
        if let data = defaults.data(forKey: "focus.active"), let stored = try? JSONDecoder().decode(FocusSession.self, from: data), stored.valid {
            focus = stored
        }
        completeFocusIfNeeded()
    }

    func record(_ result: RevisionResult) {
        guard result.valid, !results.contains(where: { $0.id == result.id }) else { return }
        results.insert(result, at: 0)
        results = Array(results.prefix(100))
        defaults.set(try? JSONEncoder().encode(results), forKey: "revision.results")
    }

    func toggleSaved(_ id: String) {
        if savedQuestions.contains(id) { savedQuestions.remove(id) } else { savedQuestions.insert(id) }
        defaults.set(Array(savedQuestions), forKey: "revision.saved")
    }

    func startFocus(minutes: Int) {
        let session = FocusSession(minutes: minutes)
        focus = session
        defaults.set(try? JSONEncoder().encode(session), forKey: "focus.active")
    }

    func stopFocus() {
        focus = nil
        defaults.removeObject(forKey: "focus.active")
    }

    func completeFocusIfNeeded(now: Date = Date()) {
        guard let session = focus, session.complete(at: now) else { return }
        if !completedFocusIDs.contains(session.id) {
            completedFocusIDs.insert(session.id)
            focusMinutes += session.minutes
            defaults.set(focusMinutes, forKey: "focus.minutes")
            // Keep a bounded receipt history; active sessions have a fresh UUID.
            if completedFocusIDs.count > 100 { completedFocusIDs = [session.id] }
            defaults.set(completedFocusIDs.map(\.uuidString), forKey: "focus.completed")
        }
        stopFocus()
    }

    func clear() {
        results = []; savedQuestions = []; focus = nil; focusMinutes = 0; completedFocusIDs = []
        for key in ["revision.results", "revision.saved", "focus.active", "focus.minutes", "focus.completed"] {
            defaults.removeObject(forKey: key)
        }
    }
}
