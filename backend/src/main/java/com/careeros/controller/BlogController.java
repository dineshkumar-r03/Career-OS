package com.careeros.controller;

import com.careeros.dto.request.BlogRequest;
import com.careeros.dto.response.BlogResponse;
import com.careeros.entity.User;
import com.careeros.service.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blogs")
@RequiredArgsConstructor
public class BlogController {
    
    private final BlogService blogService;
    
    @GetMapping
    public ResponseEntity<Page<BlogResponse>> getAllBlogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long authorId,
            Authentication authentication) {
        Long currentUserId = null;
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            currentUserId = ((User) authentication.getPrincipal()).getId();
        }
        return ResponseEntity.ok(blogService.getAllBlogs(page, size, sortBy, direction, category, authorId, currentUserId));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<BlogResponse> getBlog(@PathVariable Long id, Authentication authentication) {
        Long userId = authentication != null ? getUserId(authentication) : null;
        return ResponseEntity.ok(blogService.getBlogById(id, userId));
    }
    
    @PostMapping("/{id}/view")
    public ResponseEntity<com.careeros.dto.response.ApiResponse> incrementViewCount(@PathVariable Long id) {
        blogService.incrementViewCount(id);
        return ResponseEntity.ok(new com.careeros.dto.response.ApiResponse(true, "View count incremented"));
    }
    
    @PostMapping
    public ResponseEntity<BlogResponse> createBlog(@Valid @RequestBody BlogRequest request, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(blogService.createBlog(request, user));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<BlogResponse> updateBlog(@PathVariable Long id, @Valid @RequestBody BlogRequest request, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(blogService.updateBlog(id, request, user));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBlog(@PathVariable Long id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        blogService.deleteBlog(id, user);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/search")
    public ResponseEntity<Page<BlogResponse>> searchBlogs(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(blogService.searchBlogs(query, page, size));
    }
    
    private Long getUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return ((User) authentication.getPrincipal()).getId();
        }
        return null;
    }
}