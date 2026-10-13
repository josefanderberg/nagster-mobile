Pod::Spec.new do |s|
  s.name           = 'TjatNative'
  s.version        = '1.0.0'
  s.summary        = 'Det som Expos moduler saknar'
  s.description    = 'Haptik under inspelning, ihållande larmvibration och uppläst tjat till fil'
  s.author         = 'Josef Anderberg'
  s.homepage       = 'https://github.com/josefanderberg/nagster-mobile'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreHaptics', 'Speech'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
