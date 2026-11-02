import SwiftUI

struct PracticeRun: Identifiable { let id = UUID(); let questions: [RevisionQuestion]; let subject: String }

struct PracticeView: View {
    @EnvironmentObject private var library: RevisionLibrary
    @EnvironmentObject private var progress: LocalProgress
    @State private var search = ""
    @State private var run: PracticeRun?
    @State private var cards = false

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    Label("YOUR POCKET STUDY SPACE", systemImage: "wifi.slash").font(.caption.weight(.semibold)).foregroundStyle(.blue)
                    Text("A little practice.\nAnywhere.").font(.title.bold())
                    Text("Original questions with an explanation for every answer. Works without a connection.").foregroundStyle(.secondary)
                }.padding(.vertical, 12)
                Button { begin(subject: nil) } label: { Label("Five mixed questions", systemImage: "shuffle").padding(.vertical, 8) }
                    .disabled(library.questions.isEmpty).accessibilityIdentifier("revision.mixed")
                Button { cards = true } label: { Label("Saved flashcards (\(progress.savedQuestions.count))", systemImage: "rectangle.on.rectangle") }
            }
            if let error = library.error { Section { Text(error).foregroundStyle(.red) } }
            Section("Choose a subject") {
                ForEach(library.subjects.filter { search.isEmpty || $0.localizedCaseInsensitiveContains(search) }, id: \.self) { subject in
                    Button { begin(subject: subject) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(subject).foregroundStyle(.primary)
                                Text("\(library.questions.filter { $0.subject == subject }.count) questions available").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                        }.padding(.vertical, 5)
                    }
                }
            }
            Section { Text("Offline practice is saved on this device. It does not award online XP, Clout, qualifications or career experience.").font(.footnote).foregroundStyle(.secondary) }
        }
        .searchable(text: $search, prompt: "Find a subject")
        .navigationTitle("Revise")
        .sheet(item: $run) { run in NavigationStack { RevisionRunView(run: run) } }
        .sheet(isPresented: $cards) { NavigationStack { FlashcardsView() } }
    }

    private func begin(subject: String?) {
        run = PracticeRun(questions: RevisionSession.questions(from: library.questions, subject: subject), subject: subject ?? "Mixed subjects")
    }
}

struct RevisionRunView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var progress: LocalProgress
    let run: PracticeRun
    @State private var index = 0
    @State private var selected: Int?
    @State private var correct = 0
    @State private var finished = false
    @State private var showExit = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                if finished {
                    Image(systemName: "checkmark.seal.fill").font(.system(size: 60)).foregroundStyle(.green).accessibilityHidden(true)
                    Text("A step forward.").font(.largeTitle.bold())
                    Text("\(correct) of \(run.questions.count) correct").font(.title2).accessibilityIdentifier("revision.result")
                    Text("You made time to practise. Keep the explanations in mind and come back when you’re ready.").foregroundStyle(.secondary)
                    Label("Saved on this device", systemImage: "iphone").font(.subheadline)
                    Button("Finish", action: { dismiss() }).buttonStyle(.borderedProminent).controlSize(.large)
                } else if run.questions.indices.contains(index) {
                    let question = run.questions[index]
                    ProgressView(value: Double(index), total: Double(run.questions.count)).accessibilityLabel("Question \(index + 1) of \(run.questions.count)")
                    Text("\(index + 1) OF \(run.questions.count) · \(question.course.uppercased())").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    Text(question.topic).font(.subheadline).foregroundStyle(.blue)
                    Text(question.prompt).font(.title2.bold()).fixedSize(horizontal: false, vertical: true)
                    ForEach(question.options.indices, id: \.self) { option in
                        Button { answer(option, question: question) } label: {
                            HStack(alignment: .top) {
                                Text(question.options[option]).foregroundStyle(.primary).frame(maxWidth: .infinity, alignment: .leading)
                                if selected != nil && option == question.answer { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green) }
                                else if selected == option { Image(systemName: "xmark.circle.fill").foregroundStyle(.red) }
                            }.padding(18).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
                                .overlay(RoundedRectangle(cornerRadius: 18).stroke(selected == option ? Color.blue : .clear, lineWidth: 2))
                        }.buttonStyle(.plain).disabled(selected != nil).accessibilityIdentifier("revision.option.\(option)")
                    }
                    if let selected {
                        VStack(alignment: .leading, spacing: 10) {
                            Label(selected == question.answer ? "That’s right" : "A chance to learn", systemImage: selected == question.answer ? "checkmark.circle" : "lightbulb")
                                .font(.headline).foregroundStyle(selected == question.answer ? .green : .blue)
                            Text(question.explanation).fixedSize(horizontal: false, vertical: true)
                        }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Color.blue.opacity(0.07), in: RoundedRectangle(cornerRadius: 20))
                        Button { progress.toggleSaved(question.id) } label: {
                            Label(progress.savedQuestions.contains(question.id) ? "Saved for later" : "Save as a flashcard", systemImage: progress.savedQuestions.contains(question.id) ? "bookmark.fill" : "bookmark")
                        }.buttonStyle(.bordered).controlSize(.large)
                        Button(index + 1 == run.questions.count ? "See my result" : "Next question") { next() }
                            .buttonStyle(.borderedProminent).controlSize(.large).accessibilityIdentifier("revision.next")
                    }
                } else { Text("No questions are available for this session.") }
            }.padding(24).frame(maxWidth: 650, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(AppDesign.background).navigationTitle(run.subject).navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { if finished { dismiss() } else { showExit = true } } } }
        .interactiveDismissDisabled(!finished)
        .confirmationDialog("Leave this session?", isPresented: $showExit, titleVisibility: .visible) {
            Button("Leave without saving", role: .destructive) { dismiss() }
        } message: { Text("Only a finished session is added to your device history.") }
    }

    private func answer(_ option: Int, question: RevisionQuestion) {
        guard selected == nil else { return }
        selected = option
        if option == question.answer { correct += 1; UINotificationFeedbackGenerator().notificationOccurred(.success) }
        else { UISelectionFeedbackGenerator().selectionChanged() }
    }

    private func next() {
        if index + 1 == run.questions.count {
            guard !finished else { return }
            progress.record(RevisionResult(id: run.id, date: Date(), subject: run.subject, correct: correct, total: run.questions.count))
            finished = true
        } else { index += 1; selected = nil }
    }
}

struct FlashcardsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var progress: LocalProgress
    @EnvironmentObject private var library: RevisionLibrary
    @State private var showing: Set<String> = []
    var cards: [RevisionQuestion] { library.questions.filter { progress.savedQuestions.contains($0.id) } }

    var body: some View {
        Group {
            if cards.isEmpty {
                ContentUnavailableView("Your pocket is empty", systemImage: "bookmark", description: Text("Save a question after answering it to make a flashcard."))
            } else {
                List(cards) { card in
                    VStack(alignment: .leading, spacing: 14) {
                        Text(card.topic).font(.caption).foregroundStyle(.secondary)
                        Text(card.prompt).font(.headline)
                        if showing.contains(card.id) { Text(card.options[card.answer]).fontWeight(.semibold); Text(card.explanation) }
                        Button(showing.contains(card.id) ? "Hide answer" : "Reveal answer") {
                            if showing.contains(card.id) { showing.remove(card.id) } else { showing.insert(card.id) }
                        }.buttonStyle(.bordered)
                        Button("Remove saved card", role: .destructive) { progress.toggleSaved(card.id) }.font(.caption).buttonStyle(.borderless)
                    }.padding(.vertical, 10)
                }
            }
        }.navigationTitle("Flashcards").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
    }
}
