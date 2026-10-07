import SwiftUI
import WidgetKit

private let widgetAppGroup = "group.com.seugi.app.expowidgets"

private struct WidgetMeal: Decodable {
    let date: String
    let type: String
    let menu: [String]
    let calorie: String?
}

private struct WidgetTimetable: Decodable {
    let date: String
    let time: String
    let subject: String
}

private struct SeugiWidgetData: Decodable {
    let meals: [WidgetMeal]
    let timetable: [WidgetTimetable]
}

private enum SeugiWidgetStore {
    static func load() -> SeugiWidgetData? {
        guard
            let json = UserDefaults(suiteName: widgetAppGroup)?.string(forKey: "SeugiWidgetData"),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(SeugiWidgetData.self, from: data)
    }

    static func dateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func mealPeriod(_ date: Date) -> (type: String, label: String) {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        let hour = parts.hour ?? 0
        let minute = parts.minute ?? 0
        if hour < 8 || (hour == 8 && minute <= 20) { return ("조식", "아침") }
        if hour < 13 || (hour == 13 && minute <= 30) { return ("중식", "점심") }
        return ("석식", "저녁")
    }
}

private struct MealTimelineEntry: TimelineEntry {
    let date: Date
    let meal: WidgetMeal?
    let label: String
}

private struct MealTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> MealTimelineEntry {
        MealTimelineEntry(date: .now, meal: nil, label: SeugiWidgetStore.mealPeriod(.now).label)
    }

    func getSnapshot(in context: Context, completion: @escaping (MealTimelineEntry) -> Void) {
        completion(entry(for: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MealTimelineEntry>) -> Void) {
        let now = Date()
        completion(Timeline(entries: [entry(for: now)], policy: .after(now.addingTimeInterval(60 * 60))))
    }

    private func entry(for date: Date) -> MealTimelineEntry {
        let period = SeugiWidgetStore.mealPeriod(date)
        let meal = SeugiWidgetStore.load()?.meals.first {
            $0.date.hasPrefix(SeugiWidgetStore.dateKey(date)) && $0.type.contains(period.type)
        }
        return MealTimelineEntry(date: date, meal: meal, label: period.label)
    }
}

private struct TimetableTimelineEntry: TimelineEntry {
    let date: Date
    let timetable: [WidgetTimetable]?
}

private struct TimetableTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimetableTimelineEntry {
        TimetableTimelineEntry(date: .now, timetable: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TimetableTimelineEntry) -> Void) {
        completion(entry(for: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimetableTimelineEntry>) -> Void) {
        let now = Date()
        completion(Timeline(entries: [entry(for: now)], policy: .after(now.addingTimeInterval(60 * 60))))
    }

    private func entry(for date: Date) -> TimetableTimelineEntry {
        let items = SeugiWidgetStore.load()?.timetable
            .filter { $0.date.hasPrefix(SeugiWidgetStore.dateKey(date)) }
            .sorted { (Int($0.time) ?? 0) < (Int($1.time) ?? 0) }
        return TimetableTimelineEntry(date: date, timetable: items)
    }
}

private struct WidgetCard<Content: View>: View {
    let title: String
    let trailing: String?
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(red: 0.11, green: 0.58, blue: 0.95), in: Capsule())
                Spacer(minLength: 0)
                if let trailing, !trailing.isEmpty {
                    Text(trailing).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .padding(9)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
        }
        .padding(8)
        .background(Color(uiColor: .systemGroupedBackground))
    }
}

private struct MealWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MealTimelineEntry

    private func menuText(_ item: String) -> String {
        String(item.split(separator: " ").first ?? Substring(item))
    }

    @ViewBuilder private var menu: some View {
        if let meal = entry.meal, !meal.menu.isEmpty {
            let limit = family == .systemSmall ? 6 : 12
            let values = Array(meal.menu.prefix(limit)).map(menuText)
            if family == .systemSmall {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                        Text(value).font(.caption).foregroundStyle(.primary).lineLimit(1)
                    }
                }
            } else {
                HStack(alignment: .top, spacing: 8) {
                    ForEach(0..<((values.count + 5) / 6), id: \.self) { column in
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(Array(values.dropFirst(column * 6).prefix(6).enumerated()), id: \.offset) { _, value in
                                Text(value).font(.caption).foregroundStyle(.primary).lineLimit(1)
                            }
                        }
                    }
                }
            }
        } else {
            Text(entry.meal == nil ? "앱을 열어 급식을 업데이트하세요." : "오늘은 급식이 없어요")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    var body: some View {
        WidgetCard(title: entry.label, trailing: entry.meal?.calorie) { menu }
    }
}

private struct TimetableWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TimetableTimelineEntry

    @ViewBuilder private var periods: some View {
        if let timetable = entry.timetable, !timetable.isEmpty {
            let limit = family == .systemSmall ? 6 : 12
            let values = Array(timetable.prefix(limit))
            if family == .systemSmall {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(values.enumerated()), id: \.offset) { _, item in
                        Text(item.subject).font(.caption).foregroundStyle(.primary).lineLimit(1)
                    }
                }
            } else {
                HStack(alignment: .top, spacing: 8) {
                    ForEach(0..<((values.count + 5) / 6), id: \.self) { column in
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(Array(values.dropFirst(column * 6).prefix(6).enumerated()), id: \.offset) { _, item in
                                Text(item.subject).font(.caption).foregroundStyle(.primary).lineLimit(1)
                            }
                        }
                    }
                }
            }
        } else {
            Text(entry.timetable == nil ? "앱을 열어 시간표를 업데이트하세요." : "오늘은 시간표가 없어요")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    var body: some View {
        WidgetCard(title: "시간표", trailing: entry.date.formatted(.dateTime.month(.twoDigits).day(.twoDigits))) { periods }
    }
}

private struct SeugiMealWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SeugiMealWidget", provider: MealTimelineProvider()) { entry in
            MealWidgetView(entry: entry)
        }
        .configurationDisplayName("급식")
        .description("현재 시간대의 오늘 급식 메뉴")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct SeugiTimetableWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SeugiTimetableWidget", provider: TimetableTimelineProvider()) { entry in
            TimetableWidgetView(entry: entry)
        }
        .configurationDisplayName("시간표")
        .description("오늘의 시간표")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct SeugiWidgetBundle: WidgetBundle {
    var body: some Widget {
        SeugiMealWidget()
        SeugiTimetableWidget()
    }
}
