# Guide - Deploying Frontend and Backend on the Same Site (Monolith)

Yes, you can absolutely host both the frontend and the backend on the same site and port! This is done by **building the React frontend into static assets (HTML, CSS, JS) and configuring Spring Boot to serve them** as static resources. 

---

## 🌟 Advantages of this Approach
1. **Single Deployment**: You only deploy one application (the Spring Boot backend) to your hosting provider (like Render, AWS, or Railway).
2. **No CORS Issues**: Since the frontend and backend are served from the exact same domain and port, you don't need any CORS configuration!
3. **Free/Lower Cost**: You only run one server container instead of two.

---

## 🛠️ Step-by-Step Implementation

### Step 1: Tell React to Call Relative URLs
Because the React app will be served directly by Spring Boot, it no longer needs to specify `http://localhost:8090` or `https://careeros-backend.onrender.com` to make API calls. It can use **relative paths** (e.g., `/api/auth/login`).

1. Open [api.js](file:///c:/Users/Dinesh%20K/OneDrive/Desktop/CareerOS/frontend/src/services/api.js).
2. Change the Axios baseURL configuration to point to a relative path:
   ```javascript
   const api = axios.create({
     baseURL: '/api', // Relative path
     headers: {
       'Content-Type': 'application/json'
     }
   });
   ```

---

### Step 2: Configure Maven to Build & Copy Frontend Automatically
We can configure Spring Boot's Maven build file (`pom.xml`) to automatically build your React project and copy the output static files into Spring Boot's static resources folder (`src/main/resources/static`) every time you build the backend.

1. Open `backend/pom.xml`.
2. Add the **`frontend-maven-plugin`** and **`maven-resources-plugin`** configurations inside the `<plugins>` tag of the `pom.xml`:

```xml
<plugin>
    <groupId>com.github.eirslett</groupId>
    <artifactId>frontend-maven-plugin</artifactId>
    <version>1.15.0</version>
    <configuration>
        <workingDirectory>../frontend</workingDirectory>
        <installDirectory>target</installDirectory>
    </configuration>
    <executions>
        <!-- Install Node and npm -->
        <execution>
            <id>install node and npm</id>
            <goals>
                <goal>install-node-and-npm</goal>
            </goals>
            <configuration>
                <nodeVersion>v18.17.0</nodeVersion>
            </configuration>
        </execution>
        <!-- Run npm install -->
        <execution>
            <id>npm install</id>
            <goals>
                <goal>npm</goal>
            </goals>
            <configuration>
                <arguments>install --legacy-peer-deps</arguments>
            </configuration>
        </execution>
        <!-- Run npm run build -->
        <execution>
            <id>npm run build</id>
            <goals>
                <goal>npm</goal>
            </goals>
            <configuration>
                <arguments>run build</arguments>
            </configuration>
        </execution>
    </executions>
</plugin>

<plugin>
    <artifactId>maven-resources-plugin</artifactId>
    <executions>
        <execution>
            <id>copy-resources</id>
            <phase>prepare-package</phase>
            <goals>
                <goal>copy-resources</goal>
            </goals>
            <configuration>
                <outputDirectory>${project.build.outputDirectory}/static</outputDirectory>
                <resources>
                    <resource>
                        <!-- Copy compiled React files (dist or build folder) -->
                        <directory>../frontend/build</directory> 
                        <filtering>false</filtering>
                    </resource>
                </resources>
            </configuration>
        </execution>
    </executions>
</plugin>
```
> [!NOTE]
> Make sure to verify whether your frontend generates files in `../frontend/build` (React Scripts) or `../frontend/dist` (Vite) and adjust the `<directory>` path accordingly.

---

### Step 3: Handle React Routing in Spring Boot
Since React is a Single Page Application (SPA) with client-side routing (using React Router), if a user goes directly to a page like `https://yoursite.com/career-agent`, Spring Boot will try to find a backend route for `/career-agent`, return a `404 Not Found`, and fail.

To fix this, we configure a controller in Spring Boot to forward any non-API URL paths back to `index.html` so React Router can handle them:

1. Create a controller class in the backend:
```java
package com.careeros.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ViewController {

    @RequestMapping(value = { "/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}" })
    public String forward() {
        // Forward to index.html so React Router handles routing
        return "forward:/index.html";
    }
}
```

---

### Step 4: Build and Deploy!
Now, you only need to deploy **one single project (the backend)**!
1. When you run `mvn clean package` on the backend, it will download Node, install frontend dependencies, build the frontend React application, and package it directly inside the generated `.jar` file!
2. Deploy this single `.jar` file to **Render.com** (as a Web Service) or any cloud hosting provider.
3. The site URL provided by the cloud platform (e.g. `https://careeros.onrender.com`) will serve both your user interface and the backend REST endpoints seamlessly.
