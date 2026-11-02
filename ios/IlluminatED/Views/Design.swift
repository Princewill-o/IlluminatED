import SwiftUI

enum AppDesign {
    static let background = Color(uiColor: .systemGroupedBackground)
    static let blue = Color(red: 0.10, green: 0.39, blue: 0.91)
    static let purple = Color(red: 0.49, green: 0.39, blue: 0.85)
    static let gradient = LinearGradient(colors: [blue, Color(red: 0.42, green: 0.43, blue: 0.90)], startPoint: .topLeading, endPoint: .bottomTrailing)
}

struct FeatureCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    var color: Color = .blue
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: symbol).font(.title2).foregroundStyle(color)
                    .frame(width: 44, height: 44).background(color.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))
                Text(title).font(.headline).foregroundStyle(.primary)
                Text(subtitle).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, minHeight: 142, alignment: .topLeading)
            .padding(18).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 25))
            .contentShape(RoundedRectangle(cornerRadius: 25))
        }.buttonStyle(.plain)
    }
}

struct SectionLabel: View {
    let title: String
    var body: some View { Text(title).font(.title3.bold()).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 8) }
}

struct StatTile: View {
    let value: String
    let label: String
    let symbol: String
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Label(label, systemImage: symbol).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title2.bold()).contentTransition(.numericText())
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 23))
    }
}
