import java.util.Properties

val keystoreProperties = Properties().apply {
    val keystoreFile = rootProject.file("key.properties")
    if (keystoreFile.exists()) {
        keystoreFile.inputStream().use { load(it) }
    }
}

val releaseRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}
val releaseStoreFile =
    providers.environmentVariable("ANDROID_KEYSTORE_PATH").orNull
        ?: keystoreProperties.getProperty("storeFile")
val releaseStorePassword =
    providers.environmentVariable("ANDROID_KEYSTORE_PASSWORD").orNull
        ?: keystoreProperties.getProperty("storePassword")
val releaseKeyAlias =
    providers.environmentVariable("ANDROID_KEY_ALIAS").orNull
        ?: keystoreProperties.getProperty("keyAlias")
val releaseKeyPassword =
    providers.environmentVariable("ANDROID_KEY_PASSWORD").orNull
        ?: keystoreProperties.getProperty("keyPassword")

if (releaseRequested) {
    val missingProperties = buildList {
        if (releaseStoreFile.isNullOrBlank()) add("ANDROID_KEYSTORE_PATH / storeFile")
        if (releaseStorePassword.isNullOrBlank()) add("ANDROID_KEYSTORE_PASSWORD / storePassword")
        if (releaseKeyAlias.isNullOrBlank()) add("ANDROID_KEY_ALIAS / keyAlias")
        if (releaseKeyPassword.isNullOrBlank()) add("ANDROID_KEY_PASSWORD / keyPassword")
    }
    if (missingProperties.isNotEmpty()) {
        throw GradleException(
            "Release builds require Android signing credentials. Set " +
                missingProperties.joinToString() +
                " as environment variables or in android/key.properties."
        )
    }
    if (!file(releaseStoreFile!!).isFile) {
        throw GradleException("The Android keystore file specified by ANDROID_KEYSTORE_PATH/storeFile does not exist.")
    }
}

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "uz.encode.eduslides_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "uz.encode.eduslides_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
            storeFile = releaseStoreFile?.let { file(it) }
            storePassword = releaseStorePassword
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
