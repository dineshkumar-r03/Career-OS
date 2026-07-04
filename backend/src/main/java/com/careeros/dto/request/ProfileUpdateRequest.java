package com.careeros.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;
    
    @Email(message = "Invalid email format")
    private String email;
    
    private String college;
    private String department;
    private Integer graduationYear;
    
    @Size(max = 1000, message = "Bio must be less than 1000 characters")
    private String bio;
    
    @Size(max = 500, message = "Skills must be less than 500 characters")
    private String skills;
    
    @Size(max = 1000, message = "Interests must be less than 1000 characters")
    private String interests;
    
    @Size(max = 1000, message = "Career goals must be less than 1000 characters")
    private String careerGoals;
    
    private String github;
    private String linkedin;
    private String profilePicture;
}