package com.careeros.dto.response;

import com.careeros.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String college;
    private String department;
    private Integer graduationYear;
    private String bio;
    private String skills;
    private String interests;
    private String careerGoals;
    private String github;
    private String linkedin;
    private String profilePicture;
    private String role;
    private LocalDateTime createdAt;
    private long followersCount;
    private long followingCount;
    private long blogsCount;
    
    public static UserResponse fromUser(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setCollege(user.getCollege());
        response.setDepartment(user.getDepartment());
        response.setGraduationYear(user.getGraduationYear());
        response.setBio(user.getBio());
        response.setSkills(user.getSkills());
        response.setInterests(user.getInterests());
        response.setCareerGoals(user.getCareerGoals());
        response.setGithub(user.getGithub());
        response.setLinkedin(user.getLinkedin());
        response.setProfilePicture(user.getProfilePicture());
        response.setRole(user.getRole().name());
        response.setCreatedAt(user.getCreatedAt());
        // blogsCount defaults to 0; set it using a repository count query after calling fromUser()
        return response;
    }
}