# Maven Build Management

> "Has used Maven" appears in nearly every Java JD. The bar: read and modify any pom.xml, resolve dependency conflicts, scaffold multi-module builds, and know what a private repository is.

## 1. What Maven Solves

Ant only automated "compile & package". Maven adds three things: **project layout conventions** (standard directories), **dependency management** (central repository + declarative coordinates), and **build lifecycles** (one command runs clean-compile-test-package-deploy). Gradle is the sibling (Kotlin DSL, build caches, faster); Maven still dominates existing Java backend shops in most markets — learn one deeply and the other transfers.

Standard layout (what archetypes generate):

```
my-app/
├── pom.xml
└── src/
    ├── main/java      compiled sources → target/classes
    ├── main/resources config files packaged onto the classpath
    ├── test/java      test sources → target/test-classes
    └── test/resources
```

## 2. Installation & Mirrors (do this first)

1. Unpack, point `JAVA_HOME` at a JDK, add `bin` to PATH; verify with `mvn -v`.
2. IDEA bundles Maven; prefer your own install so local and CI behavior match.
3. **Configure a fast mirror** (direct Central access is painfully slow in many regions): edit `~/.m2/settings.xml` (Windows: `C:\Users\you\.m2\settings.xml`):

```xml
<settings>
  <localRepository>D:/maven_repo</localRepository>   <!-- optional: relocate the cache -->
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>central</mirrorOf>                    <!-- mirror only central; '*' would shadow private repos -->
      <name>aliyun</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

Company setups usually add a private server (Nexus/Artifactory) for internal artifacts and proxying, with credentials under `<servers>`.

## 3. Coordinates & POM Anatomy

Every artifact is uniquely `groupId : artifactId : version` (GAV). Skeleton:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <parent>                                   <!-- inheritance: Boot projects get version arbitration here -->
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.1</version>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>order-service</artifactId>
  <version>1.0.0-SNAPSHOT</version>          <!-- SNAPSHOT changes daily; releases are immutable -->
  <packaging>jar</packaging>                 <!-- 'pom' packaging marks an aggregator parent -->

  <properties>
    <java.version>21</java.version>
    <mybatis-plus.version>3.5.9</mybatis-plus.version>   <!-- centralize versions -->
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>com.baomidou</groupId>
      <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
      <version>${mybatis-plus.version}</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>  <!-- repackages into an executable fat jar -->
      </plugin>
    </plugins>
  </build>
</project>
```

## 4. Dependency Rules (interview + real work)

### Scopes

| Scope | Compile | Test | Runtime | Typical use |
| --- | --- | --- | --- | --- |
| compile (default) | ✅ | ✅ | ✅ | spring-web |
| provided | ✅ | ✅ | ❌ | servlet-api (container supplies it), Lombok |
| runtime | ❌ | ✅ | ✅ | JDBC drivers (implementation only needed at runtime) |
| test | ❌ | ✅ | ❌ | junit, mockito |
| system | local path — deprecated | | | |

### Version arbitration, three rules

1. **Nearest wins**: A→B→C(v1) vs A→D(v2) — the shallower D wins.
2. **Declaration order** breaks ties at equal depth.
3. **The exception that rules them all**: versions pinned in `<dependencyManagement>` / the parent POM **override transitive versions** — this is exactly how Boot's parent "arbitrates" the stack.

```xml
<!-- declare once in the parent; child modules omit <version> -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.alibaba</groupId>
      <artifactId>fastjson2</artifactId>
      <version>2.0.53</version>
    </dependency>
  </dependencies>
</dependencyManagement>
```

### Conflict triage, three moves

```bash
mvn dependency:tree -Dverbose -Dincludes=com.fasterxml.jackson.core   # who brings what
mvn dependency:analyze                                               # declared-unused / used-undeclared
```

1. Locate the source with `dependency:tree`.
2. `<exclusions>` the loser on the direct dependency:

```xml
<dependency>
  <groupId>com.some</groupId>
  <artifactId>legacy-sdk</artifactId>
  <version>1.2</version>
  <exclusions>
    <exclusion>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

3. If unification is needed, declare the wanted version directly (nearest-wins pushes it through).

**NoSuchMethodError / NoClassDefFoundError in production is a dependency conflict nine times out of ten** — compiled against one version, loaded another at runtime. Great material for the "hardest bug you've fixed" question.

### Special flavors

- `<optional>true</optional>`: not transitive (how libraries expose optional features).
- BOM imports (`<scope>import</scope>`): the Boot 4 era manages whole stacks through `spring-boot-dependencies`.

## 5. Lifecycles & Everyday Commands

Three independent lifecycles; **running a phase runs everything before it**:

- clean: clean
- default: validate → compile → test → package → verify → install → deploy
- site

```bash
mvn clean package -DskipTests        # the daily driver
mvn clean install -pl order-api -am  # build one module + its dependencies (multi-module speedup)
mvn test -Dtest=OrderServiceTest     # single test class
mvn versions:display-dependency-updates   # what could be upgraded
mvn dependency:copy-dependencies -DoutputDirectory=lib   # export deps (slim deployments)
```

Plugin binding: lifecycle phase ↔ plugin goal. `package` binds `maven-jar-plugin:jar` for jar projects; Boot's `repackage` goal replaces it with fat-jar assembly.

## 6. Multi-Module Projects (the enterprise shape)

```
mall/                      parent: packaging=pom, owns versions & dependencyManagement
├── pom.xml                <modules> aggregates four children
├── mall-common/           utilities, constants
├── mall-domain/           entities & DTOs
├── mall-order/            business module (depends on domain, common)
└── mall-admin/            boot module (depends on order etc., builds the executable jar)
```

```xml
<!-- the parent pom's three jobs -->
<modules>
  <module>mall-common</module>
  <module>mall-domain</module>
  <module>mall-order</module>
  <module>mall-admin</module>
</modules>
```

- Children point `<parent>` at the aggregator; inter-module deps are plain GAVs resolved from the local reactor/repository (IDEA rewires them as project deps).
- Maven hard-fails on module cycles — a useful smell test for your decomposition.
- Microservice repos commonly do: one project per service + a shared `xxx-bom` for version alignment.

## 7. Wrapper & Team Practice (modern defaults)

```bash
mvn wrapper:wrapper -Dmaven=3.9.9    # generates mvnw / mvnw.cmd
./mvnw clean package                 # pinned Maven version; clone and build
```

- `.mvn/maven.config` commits default flags (e.g. `-T 1C` parallel build per core).
- In CI use `mvn -B -ntp` (batch mode, no transfer progress) for clean logs.
- Corrupted local repo (stray `.lastUpdated` files causing "could not resolve"): delete that artifact's directory or force with `mvn -U`.

## 8. Chapter interview checklist

1. `<parent>` vs `<dependencyManagement>` — what each does?
2. The four scopes; the canonical `provided` example.
3. Conflict arbitration rules; when do you reach for `<exclusion>`?
4. `clean package` vs `clean install` (install publishes to the local repo for other projects).
5. SNAPSHOT vs RELEASE semantics.
6. How a multi-module build is organized; why the parent is `packaging=pom`.
7. Diagnosing a production NoSuchMethodError (the dependency-conflict war story).
