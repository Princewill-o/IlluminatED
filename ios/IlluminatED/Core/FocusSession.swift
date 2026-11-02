import Foundation

struct FocusSession: Codable, Equatable {
    let id: UUID
    let started: Date
    let ends: Date
    let minutes: Int

    init(minutes: Int, now: Date = Date()) {
        let duration = min(60, max(1, minutes))
        self.id = UUID()
        self.started = now
        self.ends = now.addingTimeInterval(Double(duration * 60))
        self.minutes = duration
    }

    func remaining(at date: Date) -> Int { max(0, Int(ceil(ends.timeIntervalSince(date)))) }
    func complete(at date: Date) -> Bool { date >= ends }
    var valid: Bool { minutes >= 1 && minutes <= 60 && abs(ends.timeIntervalSince(started) - Double(minutes * 60)) < 1 }
}
