// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
  alias(libs.plugins.android.application) apply false
  alias(libs.plugins.android.library) apply false
  alias(libs.plugins.kotlin.compose) apply false
  alias(libs.plugins.google.devtools.ksp) apply false
  alias(libs.plugins.roborazzi) apply false
  alias(libs.plugins.secrets) apply false
  alias(libs.plugins.google.services) apply false
}

extra.apply {
  set("minSdkVersion", 24)
  set("compileSdkVersion", 36)
  set("targetSdkVersion", 36)
  set("androidxActivityVersion", "1.10.1")
  set("androidxAppCompatVersion", "1.7.0")
  set("androidxCoordinatorLayoutVersion", "1.3.0")
  set("androidxCoreVersion", "1.15.0")
  set("androidxFragmentVersion", "1.8.6")
  set("coreSplashScreenVersion", "1.0.1")
  set("androidxWebkitVersion", "1.12.1")
  set("junitVersion", "4.13.2")
  set("androidxJunitVersion", "1.2.1")
  set("androidxEspressoCoreVersion", "3.6.1")
  set("cordovaAndroidVersion", "14.0.1")
}

