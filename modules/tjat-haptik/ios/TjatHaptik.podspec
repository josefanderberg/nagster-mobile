Pod::Spec.new do |s|
  s.name           = 'TjatHaptik'
  s.version        = '1.0.0'
  s.summary        = 'Haptik som expo-haptics saknar'
  s.description    = 'Haptik under inspelning och ihållande vibration till rörelsevakten'
  s.author         = 'Josef Anderberg'
  s.homepage       = 'https://github.com/josefanderberg/nagster-mobile'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
