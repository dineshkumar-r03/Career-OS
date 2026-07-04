package com.careeros.service;

import com.careeros.dto.request.ProfileUpdateRequest;
import com.careeros.dto.response.UserResponse;
import com.careeros.entity.User;
import com.careeros.repository.BlogRepository;
import com.careeros.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FollowService followService;
    private final BlogRepository blogRepository;
    
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        UserResponse response = UserResponse.fromUser(user);
        response.setBlogsCount(blogRepository.countByAuthor(user));
        return response;
    }
    
    @Transactional
    public UserResponse updateProfile(Long userId, ProfileUpdateRequest request, User currentUser) {
        if (!currentUser.getId().equals(userId)) {
            throw new RuntimeException("You can only update your own profile");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getCollege() != null) {
            user.setCollege(request.getCollege());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getGraduationYear() != null) {
            user.setGraduationYear(request.getGraduationYear());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getSkills() != null) {
            user.setSkills(request.getSkills());
        }
        if (request.getInterests() != null) {
            user.setInterests(request.getInterests());
        }
        if (request.getCareerGoals() != null) {
            user.setCareerGoals(request.getCareerGoals());
        }
        if (request.getGithub() != null) {
            user.setGithub(request.getGithub());
        }
        if (request.getLinkedin() != null) {
            user.setLinkedin(request.getLinkedin());
        }
        if (request.getProfilePicture() != null) {
            user.setProfilePicture(request.getProfilePicture());
        }
        
        userRepository.save(user);
        UserResponse response = UserResponse.fromUser(user);
        response.setBlogsCount(blogRepository.countByAuthor(user));
        return response;
    }
    
    public UserResponse getUserWithStats(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        UserResponse response = UserResponse.fromUser(user);
        
        // Add stats using proper count queries (avoids lazy loading)
        response.setFollowersCount(followService.getFollowersCount(userId));
        response.setFollowingCount(followService.getFollowingCount(userId));
        response.setBlogsCount(blogRepository.countByAuthor(user));
        
        return response;
    }
}