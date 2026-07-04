package com.careeros.service;

import com.careeros.dto.request.BlogRequest;
import com.careeros.dto.response.BlogResponse;
import com.careeros.entity.Blog;
import com.careeros.entity.User;
import com.careeros.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogService {
    
    private final BlogRepository blogRepository;
    
    public BlogResponse createBlog(BlogRequest request, User author) {
        Blog blog = new Blog();
        blog.setTitle(request.getTitle());
        blog.setSubtitle(request.getSubtitle());
        blog.setContent(request.getContent());
        blog.setCategory(request.getCategory());
        blog.setTags(request.getTags());
        blog.setCoverImage(request.getCoverImage());
        blog.setReadingTime(request.getReadingTime());
        blog.setAuthor(author);
        blog.setStatus(Blog.Status.valueOf(request.getStatus().toUpperCase()));
        
        blogRepository.save(blog);
        return BlogResponse.fromBlog(blog);
    }
    
    public BlogResponse getBlogById(Long id, Long userId) {
        Blog blog = blogRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Blog not found"));
        
        BlogResponse response = BlogResponse.fromBlog(blog);
        
        // Check if user has liked/bookmarked the blog
        if (userId != null) {
            // TODO: Set likedByCurrentUser and bookmarkedByCurrentUser
        }
        
        return response;
    }
    
    @Transactional
    public void incrementViewCount(Long id) {
        Blog blog = blogRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Blog not found"));
        
        if (blog.getStatus() == Blog.Status.PUBLISHED) {
            blog.incrementViewCount();
            blogRepository.save(blog);
        }
    }
    
    public Page<BlogResponse> getAllBlogs(int page, int size, String sortBy, String direction, String category, Long authorId, Long currentUserId) {
        Sort sort = direction.equalsIgnoreCase("asc") ? 
            Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Blog> blogPage;
        if (authorId != null) {
            User author = new User();
            author.setId(authorId);
            
            if (authorId.equals(currentUserId)) {
                // Own profile: return both PUBLISHED and DRAFT blogs
                blogPage = blogRepository.findByAuthor(author, pageable);
            } else {
                // Other profile: return only PUBLISHED blogs
                blogPage = blogRepository.findByAuthorAndStatus(author, Blog.Status.PUBLISHED, pageable);
            }
        } else if (category != null && !category.isEmpty()) {
            blogPage = blogRepository.findByCategory(category, pageable);
        } else {
            blogPage = blogRepository.findByStatus(Blog.Status.PUBLISHED, pageable);
        }
        
        return blogPage.map(BlogResponse::fromBlog);
    }
    
    public Page<BlogResponse> getUserBlogs(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        // TODO: Find blogs by author id
        return null;
    }
    
    @Transactional
    public BlogResponse updateBlog(Long id, BlogRequest request, User author) {
        Blog blog = blogRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Blog not found"));
        
        if (!blog.getAuthor().getId().equals(author.getId())) {
            throw new RuntimeException("You are not the author of this blog");
        }
        
        blog.setTitle(request.getTitle());
        blog.setSubtitle(request.getSubtitle());
        blog.setContent(request.getContent());
        blog.setCategory(request.getCategory());
        blog.setTags(request.getTags());
        blog.setCoverImage(request.getCoverImage());
        blog.setReadingTime(request.getReadingTime());
        blog.setStatus(Blog.Status.valueOf(request.getStatus().toUpperCase()));
        blog.setUpdatedAt(LocalDateTime.now());
        
        blogRepository.save(blog);
        return BlogResponse.fromBlog(blog);
    }
    
    @Transactional
    public void deleteBlog(Long id, User author) {
        Blog blog = blogRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Blog not found"));
        
        if (!blog.getAuthor().getId().equals(author.getId()) && author.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("You are not authorized to delete this blog");
        }
        
        blogRepository.delete(blog);
    }
    
    public Page<BlogResponse> searchBlogs(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return blogRepository.search(query, pageable).map(BlogResponse::fromBlog);
    }
}