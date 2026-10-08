require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SeugiMediaPicker'
  s.version        = package['version']
  s.summary        = 'Native image library picker for Seugi'
  s.description    = 'Uses Android ACTION_GET_CONTENT and iOS PHPickerViewController.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Seugi'
  s.homepage       = 'https://github.com/apeun-gidaechi/seugi'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/apeun-gidaechi/seugi.git' }
  s.swift_version  = '5.9'
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
