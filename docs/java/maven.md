# Maven 构建管理

> "使用过 Maven"是 Java 岗 JD 的标配一句。目标：看懂并修改任何 pom.xml、解决依赖冲突、会建多模块工程、知道私服是什么。

## 一、Maven 是什么、解决什么问题

Ant 只解决"编译打包"，Maven 解决三件事：**项目结构约定**（标准目录）、**依赖管理**（中央仓库 + 坐标声明式引入）、**构建生命周期**（一条命令完成清理-编译-测试-打包-部署）。同类工具 Gradle 语法更灵活（Kotlin DSL、构建缓存快），国内 Java 后端存量项目 Maven 占绝对主流，学透一个即可迁移。

标准目录结构（archetype 生成即此形态）：

```
my-app/
├── pom.xml
└── src/
    ├── main/java      编译源码 → target/classes
    ├── main/resources 配置文件 → 打进 classpath
    ├── test/java      测试源码 → target/test-classes
    └── test/resources
```

## 二、安装与镜像配置（第一件必做的事）

1. 解压安装，`JAVA_HOME` 指向 JDK，`bin` 加入 PATH；`mvn -v` 验证。
2. IDEA 默认捆绑 Maven，建议改为本机安装目录，统一版本行为。
3. **配置阿里云镜像**（国内直连中央仓库极慢）：编辑 `~/.m2/settings.xml`（Windows 在 `C:\Users\你\.m2\settings.xml`）：

```xml
<settings>
  <localRepository>D:/maven_repo</localRepository>   <!-- 可选：把仓库挪到大盘 -->
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>central</mirrorOf>                    <!-- 只代理 central，别写 * 挡住私服 -->
      <name>aliyun</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

公司环境通常再加一条私服（Nexus/Artifactory）用于内部包与代理缓存，`<servers>` 里配账号。

## 三、坐标与 POM 结构

每个构件由 **groupId : artifactId : version** 唯一确定（GAV）。pom.xml 骨架：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <parent>                                   <!-- 继承：Spring Boot 项目就是继承 boot 父 POM 获得版本仲裁 -->
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.1</version>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>order-service</artifactId>
  <version>1.0.0-SNAPSHOT</version>          <!-- SNAPSHOT 每日快照可变；RELEASE 一旦发布不可变 -->
  <packaging>jar</packaging>                 <!-- pom 打包用于父工程 -->

  <properties>
    <java.version>21</java.version>
    <mybatis-plus.version>3.5.9</mybatis-plus.version>   <!-- 版本号集中管理 -->
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
        <artifactId>spring-boot-maven-plugin</artifactId>  <!-- 打成可执行 fat jar，内嵌 tomcat -->
      </plugin>
    </plugins>
  </build>
</project>
```

## 四、依赖管理核心规则（面试 + 实战双高频）

### 依赖范围 scope

| scope | 编译 | 测试 | 运行 | 典型 |
| --- | --- | --- | --- | --- |
| compile（默认） | ✅ | ✅ | ✅ | spring-web |
| provided | ✅ | ✅ | ❌ | servlet-api（容器提供）、Lombok |
| runtime | ❌ | ✅ | ✅ | JDBC 驱动（只在运行时需要实现） |
| test | ❌ | ✅ | ❌ | junit、mockito |
| system | 本地路径，已废弃 | | | |

### 版本仲裁三条规则

1. **最短路径优先**：A→B→C(v1) 与 A→D(v2)，D 更浅则赢。
2. **声明顺序优先**：同深度看谁先声明。
3. **就近原则的例外**：`<dependencyManagement>` / 父 POM 里声明的版本**强制生效**，无视传递依赖自带版本——这就是 Spring Boot 父工程"版本仲裁"的原理。

```xml
<!-- 只在父工程声明版本，子模块引用不写 version -->
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

### 冲突排查与解决三板斧

```bash
mvn dependency:tree -Dverbose -Dincludes=com.fasterxml.jackson.core   # 看某构件的引入路径
mvn dependency:analyze                                               # 声明未用 / 用了未声明
```

1. 先 `dependency:tree` 找来源；
2. 在直接依赖上 `<exclusions>` 排掉旧版本：

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

3. 需要统一时再显式声明目标版本（利用就近原则压过传递依赖）。

**NoSuchMethodError / NoClassDefFoundError 的元凶九成是依赖冲突**——编译期用一个版本、运行期加载了另一个版本。这是面试"你线上遇到过什么疑难杂症"的好素材。

### 特殊依赖类型

- `<optional>true</optional>`：不向下传递（库对可选功能的姿势）。
- BOM 导入（`<scope>import</scope>`）：Spring Boot 4 时代用 `spring-boot-dependencies` BOM 统一管理整条技术栈版本。

## 五、生命周期与常用命令

三套生命周期彼此独立，**执行某阶段会自动执行其前所有阶段**：

- clean：clean
- default：validate → compile → test → package → verify → install → deploy
- site：site

```bash
mvn clean package -DskipTests        # 最高频：清理打包（跳过测试）
mvn clean install -pl order-api -am  # 只装某模块及其依赖模块（多模块提速）
mvn test -Dtest=OrderServiceTest     # 跑单个测试类
mvn versions:display-dependency-updates   # 检查可升级依赖
mvn dependency:copy-dependencies -DoutputDirectory=lib   # 导出依赖（瘦身部署）
```

插件绑定原理：生命周期阶段 ↔ 插件目标（goal）。`package` 对 jar 工程绑定 `maven-jar-plugin:jar`；Spring Boot 的 repackage 就是把 jar 目标替换成 fat jar 制作。

## 六、多模块工程（企业项目标准形态）

```
mall/                      父工程：packaging=pom，只做版本与依赖管理
├── pom.xml                <modules> 聚合四个子模块
├── mall-common/           工具、常量
├── mall-domain/           实体与 DTO
├── mall-order/            业务模块（依赖 domain、common）
└── mall-admin/            启动模块（依赖 order 等，打可执行 jar）
```

```xml
<!-- 父 pom 关键三件事 -->
<modules>
  <module>mall-common</module>
  <module>mall-domain</module>
  <module>mall-order</module>
  <module>mall-admin</module>
</modules>
```

- 子模块 `<parent>` 指向父工程；模块间依赖用 GAV 声明，`mvn install` 后从本地仓库解析（IDEA 自动识别为工程依赖）。
- 循环依赖 Maven 直接报错——这也是模块划分是否合理的试金石。
- 微服务仓库常见形态：每个服务独立工程 + 公共 `xxx-bom` 工程统一版本。

## 七、Wrapper 与团队协作（现代实践）

```bash
mvn wrapper:wrapper -Dmaven=3.9.9    # 生成 mvnw / mvnw.cmd
./mvnw clean package                 # 项目内锁定 Maven 版本，新人克隆即可构建
```

- `.mvn/maven.config` 可提交默认参数（如 `-T 1C` 按核数并行构建）。
- CI/CD 里用 `mvn -B -ntp`（批处理、无进度条）让日志干净。
- 本地仓库损坏（`.lastUpdated` 残留导致一直报"依赖无法解析"）：删掉对应目录或 `mvn -U` 强制刷新。

## 八、本章面试高频清单

1. pom 里 parent 和 dependencyManagement 的区别？
2. scope 四种范围与 provided 的典型例子？
3. 依赖冲突仲裁规则；exclusion 什么时候用？
4. clean package 和 clean install 区别（install 写入本地仓库供其他工程引用）。
5. SNAPSHOT 与 RELEASE 区别。
6. 多模块工程怎么组织、父工程为什么 packaging=pom。
7. 线上 NoSuchMethodError 如何定位（依赖冲突实战题）。
