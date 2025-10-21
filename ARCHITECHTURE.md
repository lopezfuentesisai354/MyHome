# MyHome - Descripción Detallada de la Estructura del Proyecto H

## 1. Introducción

Este documento proporciona una explicación detallada de la organización de carpetas y archivos dentro del proyecto **MyHome**.  
El objetivo es mantener una base de código limpia, escalable y fácil de mantener, siguiendo el patrón de arquitectura **Package-by-Feature** (Paquetes por Funcionalidad) dentro del módulo principal de Android.

---

## 2. Estructura Raíz del Proyecto

La carpeta raíz (`MyHome/`) contiene los elementos principales del proyecto y la configuración global:

MyHome/
│
├── .gitignore          # Archivos y carpetas ignorados por Git.
├── gradle.properties   # Propiedades globales de configuración de Gradle.
├── gradlew             # Script de ejecución del Gradle Wrapper para Linux/macOS.
├── gradlew.bat         # Script de ejecución del Gradle Wrapper para Windows.
├── local.properties    # Propiedades locales (SDK path, etc.). NO versionar.
├── README.md           # Descripción general del proyecto.
├── ARCHITECTURE.md     # Este archivo, detallando la estructura.
├── settings.gradle.kts # Configuración de los módulos incluidos en el proyecto (app, backend).
│
├── app/                # Módulo principal de la aplicación Android. (Detallado abajo)
├── backend/            # (Opcional) Módulo para el código del servidor/API backend.
└── gradle/             # Configuración del Gradle Wrapper.
    ├── libs.versions.toml # Catálogo centralizado de versiones de dependencias (Version Catalog).
    └── wrapper/        # Archivos del Gradle Wrapper (jar y properties).

## 3. Módulo app (Aplicación Android)

Este es el módulo principal donde reside la lógica y la interfaz de usuario de la aplicación.

app/
│
├── build.gradle.kts     # Script de configuración específico del módulo 'app' (dependencias, plugins, config. Android).
├── proguard-rules.pro   # Reglas de ProGuard/R8 para ofuscación y reducción de código en builds de release.
│
└── src/                 # Contiene los diferentes conjuntos de fuentes (source sets).
    ├── androidTest/     # Código fuente para tests instrumentados (requieren emulador/dispositivo).
    ├── main/            # Código fuente y recursos principales de la aplicación. (Detallado abajo)
    └── test/            # Código fuente para tests unitarios locales (corren en la JVM).


### 3.1. app/src/main/

El directorio principal para el código y recursos de la aplicación.

app/src/main/
│
├── AndroidManifest.xml # Manifiesto de la aplicación (permisos, componentes, metadatos).
│
├── java/com/example/myhome/ # Paquete raíz del código fuente Kotlin/Java.
│   │
│   ├── MainActivity.kt      # Actividad principal, host de la UI de Jetpack Compose.
│   ├── MyHomeApp.kt         # (Opcional) Clase Application personalizada para inicialización global (ej. DI con Hilt/Koin).
│   │
│   ├── core/                # Paquete para código y utilidades compartidas transversalmente.
│   │   ├── data/            # Abstracción del acceso a datos.
│   │   │   ├── api/         # Definiciones de servicios de red (ej. `MyHomeApiService.kt` con Retrofit/Ktor).
│   │   │   ├── db/          # Definiciones de base de datos local (ej. `AppDatabase.kt`, DAOs, Entities con Room).
│   │   │   ├── model/       # Clases de datos puras (POJOs/Data Classes): DTOs, Modelos de Dominio, Entidades.
│   │   │   └── repository/  # Interfaces e implementaciones base de repositorios (ej. `UserRepository.kt`).
│   │   │
│   │   ├── di/              # Módulos para la Inyección de Dependencias (ej. `AppModule.kt`, `NetworkModule.kt`).
│   │   │
│   │   └── ui/              # Elementos de UI comunes y reutilizables.
│   │       ├── components/  # Composables genéricos reutilizables (`CustomButton.kt`, `ErrorDialog.kt`, etc.).
│   │       └── theme/       # Tema visual de la app Compose (`Color.kt`, `Type.kt`, `Theme.kt`).
│   │
│   ├── features/            # Paquete raíz para las funcionalidades específicas de la aplicación.
│   │   ├── auth/            # Feature: Autenticación.
│   │   │   ├── LoginScreen.kt
│   │   │   ├── LoginViewModel.kt
│   │   │   └── AuthRepository.kt
│   │   │
│   │   ├── hospedajes/      # Feature: Gestión de Hospedajes.
│   │   │   ├── HospedajesScreen.kt
│   │   │   ├── HospedajeDetailScreen.kt
│   │   │   ├── HospedajesViewModel.kt
│   │   │   └── HospedajesRepository.kt
│   │   │
│   │   ├── reservas/        # Feature: Gestión de Reservas.
│   │   ├── checkin/         # Feature: Proceso de Check-in.
│   │   ├── reseñas/         # Feature: Gestión de Reseñas.
│   │   └── bitacora/        # Feature: Bitácora de eventos.
│   │
│   └── navigation/          # Lógica de navegación entre pantallas.
│       ├── AppNavHost.kt
│       └── ScreenRoutes.kt
│
└── res/                 # Recursos de la aplicación Android.
    ├── drawable/        # Gráficos (vectores XML, imágenes).
    ├── mipmap-<density>/# Iconos de la app.
    ├── values/          # Archivos XML de recursos simples.
    │   ├── strings.xml  # Textos de la aplicación (i18n).
    │   ├── colors.xml   # Colores base (opcional en Compose).
    │   └── themes.xml   # Temas XML base (antes de Compose).
    ├── xml/             # Archivos XML genéricos.
    └── font/            # (Opcional) Fuentes personalizadas.


### 3.2. Desglose de java/com/example/myhome/

core/: Contiene todo lo que no es específico de una única feature.

core/data: Separa la lógica de obtención/almacenamiento de datos del resto de la app.

core/di: Centraliza la creación de objetos y dependencias.

core/ui: Promueve consistencia visual y reutilización de componentes.

features/: Contiene las funcionalidades (cada subcarpeta = una feature).

Cada feature incluye sus pantallas (Screen.kt), su lógica (ViewModel.kt) y sus fuentes de datos (Repository.kt o UseCase.kt).

navigation/: Define cómo se conectan las pantallas (Compose Navigation).

## 4. Tests (app/src/androidTest/ y app/src/test/)

androidTest/: Tests instrumentados que requieren un dispositivo o emulador.
Ideales para pruebas de UI (Compose UI Tests) o integración con componentes del framework Android.

test/: Tests unitarios que se ejecutan en la JVM local.
Ideales para ViewModels, Repositorios o clases de utilidad puras.

## 5. Conclusión

Esta estructura basada en funcionalidades (Package-by-Feature) proporciona una base sólida para el desarrollo de MyHome.

Ventajas principales:

🧩 Modularidad: Las funcionalidades están bien separadas.

🚀 Escalabilidad: Facilita agregar nuevas features o extraerlas a módulos independientes.

🧠 Mantenibilidad: El código relacionado con cada característica está agrupado.

👥 Colaboración: Permite trabajo paralelo sin conflictos.

🧪 Testabilidad: La separación en capas y el uso de DI facilita las pruebas unitarias e integradas.

Es importante ser consistente y adherirse a esta estructura a medida que el proyecto evoluciona.