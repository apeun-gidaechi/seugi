import ExpoModulesCore
import WidgetKit

public class ExpoWidgetsModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoWidgets")

        Function("setWidgetData") { (data: String) -> Void in
            let suite = UserDefaults(suiteName: "group.com.seugi.app.expowidgets")
            suite?.set(data, forKey: "SeugiWidgetData")
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
